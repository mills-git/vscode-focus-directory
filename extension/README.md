# Focus a Directory

Search directories in your open workspace by name and jump straight to one in the file Explorer — no more clicking through nested folders to find where something lives.

## Usage

1. Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Run **Focus a Directory**
3. Start typing to fuzzy-search directory names in your workspace
4. Select one — the Explorer view switches into focus and expands/highlights that exact directory

In a multi-root workspace, each result's description shows which workspace folder it belongs to.

### Bind it to a key

Add a keybinding of your own in `keybindings.json` (**Preferences: Open Keyboard Shortcuts (JSON)**):

```json
{ "key": "ctrl+alt+d", "command": "focusDirectory.focus" }
```

## What gets excluded

The directory list respects:

- Your workspace's `.gitignore` file(s) — including nested `.gitignore`s in subdirectories, layered the same way Git itself resolves them
- VS Code's `files.exclude` and `search.exclude` settings
- `.git` directories, always

So build output, dependency folders, and anything else you've already told Git or VS Code to ignore won't clutter the picker.

## Requirements

None beyond VS Code `^1.85.0` — no configuration needed to get started.

## Known limitations

- The workspace is re-scanned on every invocation (no caching or file-watching yet), so very large monorepos may take a moment for the picker to populate.
- Only `.gitignore` files inside your opened folder are read. If you open a subfolder of a Git repository, ignore rules from the repository root above it aren't applied.

## Feedback

Found a bug or have an idea? Please open an issue at [github.com/mills-git/vscode-focus-directory](https://github.com/mills-git/vscode-focus-directory/issues).
