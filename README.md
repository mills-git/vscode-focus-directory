# Focus a Directory

Search the directories in a project by name and jump straight to one. This repository contains two things that share the same scanning logic:

| Folder | What it is |
| --- | --- |
| [`extension/`](extension) | The **Focus a Directory** VS Code extension. Its [README](extension/README.md) is the Marketplace page; release notes are in [`extension/CHANGELOG.md`](extension/CHANGELOG.md). |
| [`cli/`](cli) | A small command line tool that lists a project's directories using the same code, `.gitignore` rules included. Not published. |

The scanner (`extension/src/DirectoryScanner.ts`) is written against a small `FileSystem` interface, with one implementation backed by the VS Code API and one backed by Node's `fs`. The CLI reuses the Node one directly from `extension/src`.

## Extension

```bash
cd extension
npm ci
```

Open the repository in VS Code and press **F5** to launch an Extension Development Host with the extension loaded. Other scripts, from `extension/`:

| Command | Does |
| --- | --- |
| `npm run compile` | Type-check and bundle to `dist/` |
| `npm test` | Run the unit tests |
| `npm run test:coverage` | Run the tests with a coverage report |

## CLI

The CLI bundles the extension's source, which imports `ignore` from `extension/node_modules`, so install both:

```bash
cd extension && npm ci
cd ../cli && npm ci
```

Then, from `cli/`:

```bash
npm run build
node dist/cli.js [path]
```

It prints one directory per line, relative to `[path]` (default: the current directory), skipping `.git` and anything ignored by `.gitignore`. `npm start -- [path]` runs it straight from source with `tsx`.

## License

[MIT](extension/LICENSE)
