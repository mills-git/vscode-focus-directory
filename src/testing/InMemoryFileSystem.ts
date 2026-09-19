import { FileSystem } from "../interfaces/fileSystem";

/**
 * A directory is an object, a file is its string contents.
 * Paths are "/"-separated and resolved from the top of the tree, so
 * `{ ws: { src: { "a.ts": "" } } }` contains the directory "/ws/src".
 */
export type Tree = { [name: string]: Tree | string };

export interface InMemoryFileSystemOptions {
    /** Patterns returned from `getExcludedFiles()` (stands in for files.exclude/search.exclude). */
    excludes?: string[];
    /** Directories whose `readDirectory` call should reject, e.g. to simulate EACCES. */
    unreadableDirectories?: string[];
}

/**
 * Test double for the `FileSystem` interface so `DirectoryScanner` can be
 * exercised without touching disk or the `vscode` module.
 */
export class InMemoryFileSystem implements FileSystem<string> {
    /** Every directory `readDirectory` was asked for, in call order. */
    readonly readDirectoryCalls: string[] = [];

    constructor(
        private readonly tree: Tree,
        private readonly options: InMemoryFileSystemOptions = {},
    ) {}

    getExcludedFiles(): string[] {
        return this.options.excludes ?? [];
    }

    joinPath(directoryUri: string, pathToJoin: string): string {
        return `${directoryUri}/${pathToJoin}`;
    }

    async readFile(fileUri: string): Promise<Uint8Array<ArrayBufferLike>> {
        const node = this.resolve(fileUri);

        if (typeof node !== "string") {
            throw new Error(`ENOENT: no such file: ${fileUri}`);
        }

        return new TextEncoder().encode(node);
    }

    async readDirectory(
        directoryUri: string,
    ): Promise<{ name: string; isDirectory: boolean }[]> {
        this.readDirectoryCalls.push(directoryUri);

        if (this.options.unreadableDirectories?.includes(directoryUri)) {
            throw new Error(`EACCES: permission denied: ${directoryUri}`);
        }

        const node = this.resolve(directoryUri);

        if (node === undefined || typeof node === "string") {
            throw new Error(`ENOENT: no such directory: ${directoryUri}`);
        }

        return Object.entries(node).map(([name, child]) => ({
            name,
            isDirectory: typeof child !== "string",
        }));
    }

    private resolve(path: string): Tree | string | undefined {
        let node: Tree | string | undefined = this.tree;

        for (const segment of path.split("/").filter(Boolean)) {
            if (node === undefined || typeof node === "string") {
                return undefined;
            }

            node = node[segment];
        }

        return node;
    }
}
