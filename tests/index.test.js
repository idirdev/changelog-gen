'use strict';

/**
 * @file index.test.js
 * @description Tests for changelog-gen.
 * @author idirdev
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  COMMIT_TYPES,
  parseConventionalCommit,
  groupByType,
  generateChangelog,
  getVersionFromPackage,
} = require('../src/index.js');

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'changelog-gen-'));
}

test('COMMIT_TYPES: contains expected keys and values', () => {
  assert.ok(COMMIT_TYPES.feat);
  assert.ok(COMMIT_TYPES.fix);
  assert.ok(COMMIT_TYPES.chore);
  assert.equal(COMMIT_TYPES.feat, 'Features');
  assert.equal(COMMIT_TYPES.fix, 'Bug Fixes');
  assert.equal(COMMIT_TYPES.chore, 'Chores');
});

test('parseConventionalCommit: basic feat commit', () => {
  const c = parseConventionalCommit('feat: add login page');
  assert.equal(c.type, 'feat');
  assert.equal(c.scope, null);
  assert.equal(c.subject, 'add login page');
  assert.equal(c.breaking, false);
});

test('parseConventionalCommit: commit with scope', () => {
  const c = parseConventionalCommit('fix(auth): handle token expiry');
  assert.equal(c.type, 'fix');
  assert.equal(c.scope, 'auth');
  assert.equal(c.subject, 'handle token expiry');
});

test('parseConventionalCommit: breaking via bang', () => {
  const c = parseConventionalCommit('feat!: drop legacy API');
  assert.equal(c.breaking, true);
  assert.equal(c.type, 'feat');
  assert.equal(c.subject, 'drop legacy API');
});

test('parseConventionalCommit: breaking via BREAKING CHANGE in body', () => {
  const c = parseConventionalCommit('feat: new interface BREAKING CHANGE');
  assert.equal(c.breaking, true);
});

test('parseConventionalCommit: non-conventional falls back to other', () => {
  const c = parseConventionalCommit('just a random commit');
  assert.equal(c.type, 'other');
  assert.equal(c.subject, 'just a random commit');
  assert.equal(c.breaking, false);
});

test('parseConventionalCommit: empty string does not throw', () => {
  const c = parseConventionalCommit('');
  assert.equal(c.type, 'other');
  assert.equal(c.subject, '');
});

test('groupByType: groups into correct sections', () => {
  const commits = [
    { type: 'feat', subject: 'add dash', scope: null, breaking: false },
    { type: 'feat', subject: 'add sidebar', scope: null, breaking: false },
    { type: 'fix', subject: 'fix bug', scope: null, breaking: false },
    { type: 'chore', subject: 'update deps', scope: null, breaking: false },
  ];
  const g = groupByType(commits);
  assert.equal(g['Features'].length, 2);
  assert.equal(g['Bug Fixes'].length, 1);
  assert.equal(g['Chores'].length, 1);
});

test('groupByType: unknown type maps to Other Changes', () => {
  const g = groupByType([{ type: 'wip', subject: 'WIP', scope: null, breaking: false }]);
  assert.ok(g['Other Changes']);
  assert.equal(g['Other Changes'].length, 1);
});

test('generateChangelog: version and date appear in header', () => {
  const commits = [{ type: 'feat', subject: 'new feature', scope: null, breaking: false }];
  const md = generateChangelog(commits, { version: '1.2.0', date: '2026-01-01' });
  assert.ok(md.includes('[1.2.0]'));
  assert.ok(md.includes('2026-01-01'));
});

test('generateChangelog: renders feature and fix sections', () => {
  const commits = [
    { type: 'feat', subject: 'implement search', scope: 'ui', breaking: false },
    { type: 'fix', subject: 'null pointer error', scope: null, breaking: false },
  ];
  const md = generateChangelog(commits, { version: '2.0.0', date: '2026-03-16' });
  assert.ok(md.includes('Features'));
  assert.ok(md.includes('implement search'));
  assert.ok(md.includes('Bug Fixes'));
  assert.ok(md.includes('null pointer error'));
});

test('generateChangelog: breaking changes section present', () => {
  const commits = [{ type: 'feat', subject: 'drop support', scope: null, breaking: true }];
  const md = generateChangelog(commits, { version: '3.0.0', date: '2026-01-01' });
  assert.ok(md.includes('BREAKING'));
});

test('generateChangelog: empty commits returns no-changes message', () => {
  const md = generateChangelog([], { version: '1.0.0', date: '2026-01-01' });
  assert.ok(md.includes('[1.0.0]'));
  assert.ok(md.includes('No changes'));
});

test('getVersionFromPackage: reads version field', () => {
  const dir = tmpDir();
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ version: '4.5.6' }));
  assert.equal(getVersionFromPackage(dir), '4.5.6');
});

test('getVersionFromPackage: returns 0.0.0 when file missing', () => {
  assert.equal(getVersionFromPackage(tmpDir()), '0.0.0');
});
