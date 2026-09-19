import path from "node:path";
import { FileSystem } from "../interfaces/fileSystem";
import { promises as fs } from "fs";

class LocalFileSystem implements FileSystem<string> {
    getExcludedFiles(): string[] {
        return [];
    }

    joinPath(directoryUri: string, pathToJoin: string): string {
        return path.join(directoryUri, pathToJoin);
    }

    async readFile(fileUri: string): Promise<Uint8Array<ArrayBufferLike>> {
        return await fs.readFile(fileUri);
    }

    async readDirectory(
        directoryUri: string,
    ): Promise<{ name: string; isDirectory: boolean }[]> {
        const directoryContents = await fs.readdir(directoryUri);

        const contents = await Promise.all(
            directoryContents.map(async (item) => {
                const fullPath = path.join(directoryUri, item);

                const isDirectory = (await fs.stat(fullPath)).isDirectory();

                return { name: item, isDirectory: isDirectory };
            }),
        );

        return contents;
    }
}

export { LocalFileSystem };
