import { test } from "node:test";
import assert from "node:assert/strict";
import { DirectoryScanner } from "./DirectoryScanner";
import {
    InMemoryFileSystem,
    InMemoryFileSystemOptions,
    Tree,
} from "./testing/InMemoryFileSystem";

const singleRoot = [{ name: "ws", uri: "/ws" }];

async function scan(
    tree: Tree,
    folders = singleRoot,
    options?: InMemoryFileSystemOptions,
) {
    const fileSystem = new InMemoryFileSystem(tree, options);
    const results = await new DirectoryScanner(
        fileSystem,
    ).collectWorkspaceDirectories(folders);

    return { results, fileSystem, labels: results.map((r) => r.label) };
}

test("returns nothing when there are no workspace folders", async () => {
    const { results } = await scan({}, []);
    assert.deepEqual(results, []);
});

test("returns nothing for a folder that contains only files", async () => {
    const { results } = await scan({ ws: { "a.txt": "", "b.txt": "" } });
    assert.deepEqual(results, []);
});

test("lists nested directories with root-relative labels, sorted, skipping files", async () => {
    const { results } = await scan({
        ws: {
            b: { inner: {}, "file.txt": "" },
            a: {},
            "README.md": "",
        },
    });

    assert.deepEqual(results, [
        { label: "a", description: undefined, uri: "/ws/a" },
        { label: "b", description: undefined, uri: "/ws/b" },
        { label: "b/inner", description: undefined, uri: "/ws/b/inner" },
    ]);
});

test("always skips .git, without descending into it", async () => {
    const { labels, fileSystem } = await scan({
        ws: { ".git": { objects: {} }, src: {} },
    });

    assert.deepEqual(labels, ["src"]);
    assert.ok(!fileSystem.readDirectoryCalls.includes("/ws/.git"));
});

test("root .gitignore directory-only patterns exclude a directory and are never descended into", async () => {
    const { labels, fileSystem } = await scan({
        ws: {
            ".gitignore": "dist/\n",
            dist: { inner: {} },
            src: {},
        },
    });

    assert.deepEqual(labels, ["src"]);
    assert.ok(!fileSystem.readDirectoryCalls.includes("/ws/dist"));
});

test("a leading-slash root pattern only excludes the root-level match", async () => {
    const { labels } = await scan({
        ws: {
            ".gitignore": "/build\n",
            build: {},
            src: { build: {} },
        },
    });

    assert.deepEqual(labels, ["src", "src/build"]);
});

test("nested .gitignore files only apply within their own subtree", async () => {
    const { labels } = await scan({
        ws: {
            build: {},
            packages: {
                foo: { ".gitignore": "build/\n", build: {}, src: {} },
                bar: { build: {} },
            },
        },
    });

    assert.deepEqual(labels, [
        "build",
        "packages",
        "packages/bar",
        "packages/bar/build",
        "packages/foo",
        "packages/foo/src",
    ]);
});

test("nested negation patterns re-include a directory excluded by an ancestor rule", async () => {
    const { labels } = await scan({
        ws: {
            ".gitignore": "packages/foo/*\n",
            packages: {
                foo: { ".gitignore": "!keep/\n", keep: {}, build: {} },
            },
        },
    });

    assert.deepEqual(labels, ["packages", "packages/foo", "packages/foo/keep"]);
});

test("CRLF line endings in a .gitignore are handled", async () => {
    const { labels } = await scan({
        ws: {
            ".gitignore": "dist/\r\nout/\r\n",
            dist: {},
            out: {},
            src: {},
        },
    });

    assert.deepEqual(labels, ["src"]);
});

test("patterns from getExcludedFiles (files.exclude/search.exclude) apply at any depth", async () => {
    const { labels } = await scan(
        {
            ws: {
                node_modules: { pkg: {} },
                packages: { a: { node_modules: {}, src: {} } },
            },
        },
        singleRoot,
        { excludes: ["**/node_modules"] },
    );

    assert.deepEqual(labels, ["packages", "packages/a", "packages/a/src"]);
});

test("a single workspace folder leaves the description undefined", async () => {
    const { results } = await scan({ ws: { src: {} } });
    assert.equal(results[0].description, undefined);
});

test("multiple workspace folders are described by folder name and merged into one sorted list", async () => {
    const { results } = await scan(
        {
            one: { src: {} },
            two: { src: {}, lib: {} },
        },
        [
            { name: "one", uri: "/one" },
            { name: "two", uri: "/two" },
        ],
    );

    assert.deepEqual(results, [
        { label: "lib", description: "two", uri: "/two/lib" },
        { label: "src", description: "one", uri: "/one/src" },
        { label: "src", description: "two", uri: "/two/src" },
    ]);
});

test("each workspace folder uses its own root .gitignore", async () => {
    const { results } = await scan(
        {
            one: { ".gitignore": "gen/\n", gen: {}, src: {} },
            two: { gen: {}, src: {} },
        },
        [
            { name: "one", uri: "/one" },
            { name: "two", uri: "/two" },
        ],
    );

    assert.deepEqual(
        results.map((r) => `${r.description}:${r.label}`),
        ["two:gen", "one:src", "two:src"],
    );
});

test("an unreadable subdirectory is reported but does not abort the scan", async (t) => {
    const errorLog = t.mock.method(console, "error", () => {});

    const { labels } = await scan(
        { ws: { a: { inner: {} }, b: { inner: {} } } },
        singleRoot,
        { unreadableDirectories: ["/ws/a"] },
    );

    assert.deepEqual(labels, ["a", "b", "b/inner"]);
    assert.equal(errorLog.mock.callCount(), 1);
});

test("an unreadable workspace root yields no results instead of throwing", async (t) => {
    const errorLog = t.mock.method(console, "error", () => {});

    const { results } = await scan({ ws: { src: {} } }, singleRoot, {
        unreadableDirectories: ["/ws"],
    });

    assert.deepEqual(results, []);
    assert.equal(errorLog.mock.callCount(), 1);
});
