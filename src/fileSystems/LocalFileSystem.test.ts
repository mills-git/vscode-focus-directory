import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { LocalFileSystem } from "./LocalFileSystem";
import { DirectoryScanner } from "../DirectoryScanner";

let root: string;

before(() => {
    root = mkdtempSync(path.join(tmpdir(), "focus-directory-test-"));

    mkdirSync(path.join(root, "src", "deep"), { recursive: true });
    mkdirSync(path.join(root, "dist", "inner"), { recursive: true });
    mkdirSync(path.join(root, ".git", "objects"), { recursive: true });
    writeFileSync(path.join(root, "README.md"), "hello");
    writeFileSync(path.join(root, ".gitignore"), "dist/\n");
    writeFileSync(path.join(root, "src", "index.ts"), "");
});

after(() => {
    rmSync(root, { recursive: true, force: true });
});

test("getExcludedFiles has no editor-level excludes", () => {
    assert.deepEqual(new LocalFileSystem().getExcludedFiles(), []);
});

test("joinPath joins using the platform separator", () => {
    assert.equal(
        new LocalFileSystem().joinPath(root, "src"),
        path.join(root, "src"),
    );
});

test("readDirectory reports files and directories correctly, wherever the process was started from", async () => {
    // Regression: entries used to be stat'ed by bare name, which resolves
    // against process.cwd() instead of the directory being read. The temp
    // directory is deliberately not the cwd.
    assert.notEqual(path.resolve(process.cwd()), path.resolve(root));

    const entries = await new LocalFileSystem().readDirectory(root);
    const byName = Object.fromEntries(
        entries.map((e) => [e.name, e.isDirectory]),
    );

    assert.deepEqual(byName, {
        src: true,
        dist: true,
        ".git": true,
        "README.md": false,
        ".gitignore": false,
    });
});

test("readDirectory works for a nested directory", async () => {
    const entries = await new LocalFileSystem().readDirectory(
        path.join(root, "src"),
    );
    const byName = Object.fromEntries(
        entries.map((e) => [e.name, e.isDirectory]),
    );

    assert.deepEqual(byName, { deep: true, "index.ts": false });
});

test("readDirectory rejects for a path that does not exist", async () => {
    await assert.rejects(
        new LocalFileSystem().readDirectory(path.join(root, "nope")),
        { code: "ENOENT" },
    );
});

test("readFile returns the file's bytes", async () => {
    const bytes = await new LocalFileSystem().readFile(
        path.join(root, "README.md"),
    );

    assert.equal(Buffer.from(bytes).toString("utf8"), "hello");
});

test("readFile rejects for a missing file", async () => {
    await assert.rejects(
        new LocalFileSystem().readFile(path.join(root, "missing.txt")),
        { code: "ENOENT" },
    );
});

test("DirectoryScanner over the real filesystem honours .gitignore, skips .git and files", async () => {
    const results = await new DirectoryScanner(
        new LocalFileSystem(),
    ).collectWorkspaceDirectories([{ name: "tmp", uri: root }]);

    assert.deepEqual(
        results.map((r) => ({ label: r.label, uri: r.uri })),
        [
            { label: "src", uri: path.join(root, "src") },
            { label: "src/deep", uri: path.join(root, "src", "deep") },
        ],
    );
});
