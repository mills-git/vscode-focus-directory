import * as vscode from "vscode";
import {
    createBaselineIgnore,
    Ignore,
    isDirectoryIgnored,
    scopedIgnore,
} from "./gitignoreMatcher";
import { FileSystem } from "./interfaces/fileSystem";

const ALWAYS_SKIP = new Set([".git"]);

type Uri = vscode.Uri | string;

export type DirectoryPickItem = vscode.QuickPickItem & {
    uri: vscode.Uri;
};

class DirectoryScanner<T extends Uri> {
    readonly fileSystem: FileSystem<T>;

    constructor(fileSystem: FileSystem<T>) {
        this.fileSystem = fileSystem;
    }

    buildBaselineIgnore(): Ignore {
        const excludePatterns = this.fileSystem.getExcludedFiles();

        return createBaselineIgnore(excludePatterns);
    }

    async readGitignore(directoryUri: T): Promise<string | undefined> {
        try {
            const gitignoreUri = this.fileSystem.joinPath(
                directoryUri,
                ".gitignore",
            );

            const bytes = await this.fileSystem.readFile(gitignoreUri);

            return Buffer.from(bytes).toString("utf8");
        } catch {
            return undefined;
        }
    }

    async walk(
        directoryUri: T,
        relativePath: string,
        matcher: Ignore,
        workspaceFolderName: string | undefined,
        results: { label: string; description: string | undefined; uri: T }[],
    ): Promise<void> {
        let entries: { name: string, isDirectory: boolean }[];

        try {
            entries = await this.fileSystem.readDirectory(directoryUri);
        } catch (error){
            console.error(`Error occurred when reading directory: ${error}`);
            return;
        }

        for (const entry of entries) {
            if (!entry.isDirectory) {
                continue;
            }
            if (ALWAYS_SKIP.has(entry.name)) {
                continue;
            }

            const childRelativePath = relativePath
                ? `${relativePath}/${entry.name}`
                : entry.name;

            if (isDirectoryIgnored(matcher, childRelativePath)) {
                continue;
            }

            const childUri = this.fileSystem.joinPath(directoryUri, entry.name);

            results.push({
                label: childRelativePath,
                description: workspaceFolderName,
                uri: childUri,
            });

            const gitignoreContents = await this.readGitignore(childUri);

            const childMatcher = gitignoreContents
                ? scopedIgnore(matcher, gitignoreContents, childRelativePath)
                : matcher;

            await this.walk(
                childUri,
                childRelativePath,
                childMatcher,
                workspaceFolderName,
                results,
            );
        }
    }

    async collectWorkspaceDirectories(
        folders: { name: string; uri: T }[],
    ): Promise<{ label: string; description: string | undefined; uri: T }[]> {
        const isMultiRoot = folders.length > 1;
        const results: {
            label: string;
            description: string | undefined;
            uri: T;
        }[] = [];

        for (const folder of folders) {
            const baseline = this.buildBaselineIgnore();
            const rootGitignore = await this.readGitignore(folder.uri);
            const rootMatcher = rootGitignore
                ? scopedIgnore(baseline, rootGitignore, "")
                : baseline;

            await this.walk(
                folder.uri,
                "",
                rootMatcher,
                isMultiRoot ? folder.name : undefined,
                results,
            );
        }

        results.sort((a, b) => a.label.localeCompare(b.label));

        return results;
    }
}

export { DirectoryScanner };
