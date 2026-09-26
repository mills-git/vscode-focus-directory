import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBaselineIgnore, isDirectoryIgnored, scopedIgnore } from './gitignoreMatcher';

test('createBaselineIgnore matches only the given patterns', () => {
  const ig = createBaselineIgnore(['node_modules', 'dist']);
  assert.equal(isDirectoryIgnored(ig, 'node_modules'), true);
  assert.equal(isDirectoryIgnored(ig, 'dist'), true);
  assert.equal(isDirectoryIgnored(ig, 'src'), false);
});

test('createBaselineIgnore with no patterns ignores nothing', () => {
  const ig = createBaselineIgnore([]);
  assert.equal(isDirectoryIgnored(ig, 'node_modules'), false);
});

test('root-level .gitignore patterns apply directly', () => {
  const baseline = createBaselineIgnore([]);
  const ig = scopedIgnore(baseline, '*.log\n', '');
  assert.equal(isDirectoryIgnored(ig, 'debug.log'), true);
  assert.equal(isDirectoryIgnored(ig, 'debug.txt'), false);
});

test('directory-only patterns (trailing slash) match, since every checked path here is a directory', () => {
  const baseline = createBaselineIgnore([]);
  const ig = scopedIgnore(baseline, 'dist/\n', '');
  assert.equal(isDirectoryIgnored(ig, 'dist'), true);
});

test('nested .gitignore patterns are scoped to their own subdirectory', () => {
  const baseline = createBaselineIgnore([]);
  const ig = scopedIgnore(baseline, 'build/\n', 'packages/foo');
  assert.equal(isDirectoryIgnored(ig, 'packages/foo/build'), true);
  assert.equal(isDirectoryIgnored(ig, 'build'), false, 'a top-level "build" dir should be unaffected by the nested rule');
  assert.equal(isDirectoryIgnored(ig, 'packages/bar/build'), false, 'a sibling package should be unaffected');
});

test('child matchers inherit ancestor .gitignore rules', () => {
  const baseline = createBaselineIgnore([]);
  const root = scopedIgnore(baseline, 'dist/\n', '');
  const child = scopedIgnore(root, undefined, 'packages/foo');
  assert.equal(
    isDirectoryIgnored(child, 'packages/foo/dist'),
    true,
    'unanchored root pattern should still match at any depth',
  );
  assert.equal(isDirectoryIgnored(child, 'dist'), true, 'root-level match should still hold on the child matcher');
});

test('a leading slash in a nested .gitignore anchors to that subdirectory only', () => {
  const baseline = createBaselineIgnore([]);
  const ig = scopedIgnore(baseline, '/only-here\n', 'packages/foo');
  assert.equal(isDirectoryIgnored(ig, 'packages/foo/only-here'), true);
  assert.equal(isDirectoryIgnored(ig, 'packages/foo/nested/only-here'), false);
});

test('comments and blank lines in .gitignore content are skipped', () => {
  const baseline = createBaselineIgnore([]);
  const ig = scopedIgnore(baseline, '# a comment\n\nnode_modules\n', '');
  assert.equal(isDirectoryIgnored(ig, 'node_modules'), true);
  assert.equal(isDirectoryIgnored(ig, '# a comment'), false);
});

test('negation patterns in a nested .gitignore un-ignore the intended path', () => {
  const baseline = createBaselineIgnore([]);
  const root = scopedIgnore(baseline, 'packages/foo/*\n', '');
  const child = scopedIgnore(root, '!keep/\n', 'packages/foo');
  assert.equal(isDirectoryIgnored(child, 'packages/foo/build'), true, 'sanity check: the root wildcard still applies');
  assert.equal(
    isDirectoryIgnored(child, 'packages/foo/keep'),
    false,
    'the nested negation should un-ignore this path',
  );
});
