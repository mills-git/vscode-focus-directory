import * as vscode from "vscode";

type Uri = vscode.Uri | string;

interface FileSystem<T extends Uri> {
    getExcludedFiles(): string[];
    joinPath(directoryUri: T, pathToJoin: string): T;
    readFile(fileUri: T): Promise<Uint8Array<ArrayBufferLike>>;
    readDirectory(
        directoryUri: T,
    ): Thenable<{ name: string; isDirectory: boolean }[]>;
}

export { FileSystem };
