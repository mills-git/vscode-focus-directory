import ignore, { Ignore } from 'ignore';

export function createBaselineIgnore(excludePatterns: string[]): Ignore {
  const ig = ignore();
  if (excludePatterns.length > 0) {
    ig.add(excludePatterns);
  }
  return ig;
}

/**
 * Prefixes a single `.gitignore` pattern with the relative path of the
 * directory it came from, so it can be evaluated against paths relative to
 * the workspace root instead of relative to that subdirectory.
 *
 * Negation patterns (`!pattern`) need the `!` to stay at the very front of
 * the resulting string, or the `ignore` package treats it as a literal
 * (non-negating) pattern instead of un-ignoring the prefixed path.
 */
function prefixPattern(pattern: string, relativePrefix: string): string {
  if (!relativePrefix) {
    return pattern;
  }

  const negated = pattern.startsWith('!');
  const body = negated ? pattern.slice(1) : pattern;
  const prefixed = `${relativePrefix}/${body.replace(/^\//, '')}`;
  return negated ? `!${prefixed}` : prefixed;
}

/**
 * Layers a directory's own `.gitignore` contents on top of its parent's
 * accumulated matcher, mirroring how git resolves nested `.gitignore` files:
 * the child inherits every ancestor rule, plus its own patterns scoped to
 * its own subtree.
 */
export function scopedIgnore(parent: Ignore, gitignoreContents: string | undefined, relativePrefix: string): Ignore {
  const ig = ignore();
  // Re-apply the parent's patterns so nested .gitignore rules layer on top of ancestor rules.
  ig.add(parent);

  if (gitignoreContents) {
    const patterns = gitignoreContents
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith('#'))
      .map((pattern) => prefixPattern(pattern, relativePrefix));
    ig.add(patterns);
  }

  return ig;
}

/**
 * Checks whether a directory (given as a path relative to the workspace
 * root, no trailing slash needed) is ignored.
 *
 * The `ignore` package can't infer from a bare path string whether it names
 * a file or a directory, which matters because directory-only patterns
 * (e.g. `dist/`, `build/` — a very common `.gitignore` style) only match
 * paths that themselves end in `/`. Since every path this scanner checks is
 * a directory, this helper appends that trailing slash so callers never
 * have to remember the convention (and directory-only patterns actually
 * take effect).
 */
export function isDirectoryIgnored(matcher: Ignore, relativePath: string): boolean {
  const withTrailingSlash = relativePath.endsWith('/') ? relativePath : `${relativePath}/`;
  return matcher.ignores(withTrailingSlash);
}

export type { Ignore };
