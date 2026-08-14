import * as vscode from 'vscode';
import { collectWorkspaceDirectories, DirectoryPickItem } from './directoryScanner';

async function focusDirectory(): Promise<void> {
  if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
    vscode.window.showInformationMessage('Open a folder to use Focus a Directory.');
    return;
  }

  const quickPick = vscode.window.createQuickPick<DirectoryPickItem>();
  quickPick.placeholder = 'Search for a directory to focus...';
  quickPick.matchOnDescription = true;
  quickPick.busy = true;
  quickPick.show();

  try {
    quickPick.items = await collectWorkspaceDirectories();
  } catch (err) {
    quickPick.hide();
    vscode.window.showErrorMessage(`Focus a Directory: failed to scan workspace (${String(err)}).`);
    return;
  } finally {
    quickPick.busy = false;
  }

  quickPick.onDidAccept(async () => {
    const selected = quickPick.selectedItems[0];
    quickPick.hide();
    if (!selected) {
      return;
    }
    await vscode.commands.executeCommand('workbench.view.explorer');
    await vscode.commands.executeCommand('revealInExplorer', selected.uri);
  });

  quickPick.onDidHide(() => quickPick.dispose());
}

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(vscode.commands.registerCommand('focusDirectory.focus', focusDirectory));
}

export function deactivate(): void {}
