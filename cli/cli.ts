import { stat } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import { DirectoryScanner } from "../extension/src/DirectoryScanner";
import { LocalFileSystem } from "../extension/src/fileSystems/LocalFileSystem";

const USAGE = `Usage: focus-directory [path]

Lists the directories under <path> (default: the current directory), one per
line and relative to <path>. Respects .gitignore and always skips .git.

Options:
  -h, --help  Show this help`;

async function main(argv: string[]): Promise<number> {
    let parsed;

    try {
        parsed = parseArgs({
            args: argv,
            allowPositionals: true,
            options: { help: { type: "boolean", short: "h" } },
        });
    } catch (error) {
        console.error(`focus-directory: ${(error as Error).message}\n\n${USAGE}`);
        return 2;
    }

    if (parsed.values.help) {
        console.log(USAGE);
        return 0;
    }

    if (parsed.positionals.length > 1) {
        console.error(`focus-directory: expected at most one path\n\n${USAGE}`);
        return 2;
    }

    const root = path.resolve(parsed.positionals[0] ?? ".");

    // The scanner logs and skips an unreadable root instead of failing, so
    // check up front to avoid printing nothing and exiting 0 on a typo.
    const isDirectory = await stat(root).then(
        (stats) => stats.isDirectory(),
        () => false,
    );

    if (!isDirectory) {
        console.error(`focus-directory: not a directory: ${root}`);
        return 1;
    }

    const directories = await new DirectoryScanner(
        new LocalFileSystem(),
    ).collectWorkspaceDirectories([{ name: path.basename(root), uri: root }]);

    for (const directory of directories) {
        console.log(directory.label);
    }

    return 0;
}

main(process.argv.slice(2)).then(
    (exitCode) => {
        process.exitCode = exitCode;
    },
    (error) => {
        console.error(error);
        process.exitCode = 1;
    },
);
