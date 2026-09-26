import * as vscode from "vscode";
import { FileSystem } from "../interfaces/fileSystem";

class VsCodeFileSystem implements FileSystem<vscode.Uri> {
    getExcludedFiles(): string[] {
        const config = vscode.workspace.getConfiguration();
        const filesExclude =
            config.get<Record<string, boolean>>("files.exclude") ?? {};
        const searchExclude =
            config.get<Record<string, boolean>>("search.exclude") ?? {};

        const excludePatterns = [
            ...Object.entries(filesExclude),
            ...Object.entries(searchExclude),
        ]
            .filter(([, enabled]) => enabled)
            .map(([pattern]) => pattern);

        return excludePatterns;
    }

    joinPath(directoryUri: vscode.Uri, pathToJoin: string): vscode.Uri {
        return vscode.Uri.joinPath(directoryUri, pathToJoin);
    }

    async readFile(fileUri: vscode.Uri): Promise<Uint8Array<ArrayBufferLike>> {
        return await vscode.workspace.fs.readFile(fileUri);
    }

    async readDirectory(
        directoryUri: vscode.Uri,
    ): Promise<{ name: string; isDirectory: boolean }[]> {
        const directoryContents =
            await vscode.workspace.fs.readDirectory(directoryUri);

        return directoryContents.map(([name, fileType]) => {
            return {
                name: name,
                isDirectory: fileType == vscode.FileType.Directory,
            };
        });
    }
}

export { VsCodeFileSystem };
