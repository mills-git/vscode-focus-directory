import * as vscode from 'vscode';
import ignore, { Ignore } from 'ignore';

export interface DirectoryPickItem extends vscode.QuickPickItem {
  uri: vscode.Uri;
}

const ALWAYS_SKIP = new Set(['.git']);

function buildBaselineIgnore(): Ignore {
  const ig = ignore();
  const config = vscode.workspace.getConfiguration();
  const filesExclude = config.get<Record<string, boolean>>('files.exclude') ?? {};
  const searchExclude = config.get<Record<string, boolean>>('search.exclude') ?? {};

  for (const [pattern, enabled] of [...Object.entries(filesExclude), ...Object.entries(searchExclude)]) {
    if (enabled) {
      ig.add(pattern);
    }
  }

  return ig;
}

async function readGitignore(dirUri: vscode.Uri): Promise<string | undefined> {
  try {
    const gitignoreUri = vscode.Uri.joinPath(dirUri, '.gitignore');
    const bytes = await vscode.workspace.fs.readFile(gitignoreUri);
    return Buffer.from(bytes).toString('utf8');
  } catch {
    return undefined;
  }
}

function scopedIgnore(parent: Ignore, gitignoreContents: string | undefined, relativePrefix: string): Ignore {
  const ig = ignore();
  // Re-apply the parent's patterns so nested .gitignore rules layer on top of ancestor rules.
  ig.add(parent);

  if (gitignoreContents) {
    const patterns = gitignoreContents
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith('#'))
      .map((pattern) => (relativePrefix ? `${relativePrefix}/${pattern.replace(/^\//, '')}` : pattern));
    ig.add(patterns);
  }

  return ig;
}

async function walk(
  dirUri: vscode.Uri,
  relativePath: string,
  matcher: Ignore,
  workspaceFolderName: string | undefined,
  results: DirectoryPickItem[],
): Promise<void> {
  let entries: [string, vscode.FileType][];
  try {
    entries = await vscode.workspace.fs.readDirectory(dirUri);
  } catch {
    return;
  }

  for (const [name, fileType] of entries) {
    if (fileType !== vscode.FileType.Directory) {
      continue;
    }
    if (ALWAYS_SKIP.has(name)) {
      continue;
    }

    const childRelativePath = relativePath ? `${relativePath}/${name}` : name;
    if (matcher.ignores(childRelativePath)) {
      continue;
    }

    const childUri = vscode.Uri.joinPath(dirUri, name);
    results.push({
      label: childRelativePath,
      description: workspaceFolderName,
      uri: childUri,
    });

    const gitignoreContents = await readGitignore(childUri);
    const childMatcher = gitignoreContents ? scopedIgnore(matcher, gitignoreContents, childRelativePath) : matcher;

    await walk(childUri, childRelativePath, childMatcher, workspaceFolderName, results);
  }
}

export async function collectWorkspaceDirectories(): Promise<DirectoryPickItem[]> {
  const folders = vscode.workspace.workspaceFolders ?? [];
  const isMultiRoot = folders.length > 1;
  const results: DirectoryPickItem[] = [];

  for (const folder of folders) {
    const baseline = buildBaselineIgnore();
    const rootGitignore = await readGitignore(folder.uri);
    const rootMatcher = rootGitignore ? scopedIgnore(baseline, rootGitignore, '') : baseline;

    await walk(folder.uri, '', rootMatcher, isMultiRoot ? folder.name : undefined, results);
  }

  results.sort((a, b) => a.label.localeCompare(b.label));
  return results;
}
