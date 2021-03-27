'use strict';
const { parseSubject, extractIssues, detectBreaking, parseCommit, groupByType } = require('../src/parser');
const { formatCommitLine } = require('../src/generator');
let passed = 0;
let failed = 0;
function assert(cond, msg) {
  if (cond) { console.log('  PASS: ' + msg); passed++; }
  else { console.log('  FAIL: ' + msg); failed++; }
}
function assertEq(a, b, msg) {
  if (JSON.stringify(a) === JSON.stringify(b)) assert(true, msg);
  else assert(false, msg + ' -- expected ' + JSON.stringify(b) + ', got ' + JSON.stringify(a));
}
console.log('\nparseSubject');
assertEq(parseSubject('feat: add login page'), { type: 'feat', scope: null, breaking: false, description: 'add login page' }, 'parses simple feat');
assertEq(parseSubject('fix(auth): resolve token expiry'), { type: 'fix', scope: 'auth', breaking: false, description: 'resolve token expiry' }, 'parses with scope');
assertEq(parseSubject('refactor!: rewrite core module'), { type: 'refactor', scope: null, breaking: true, description: 'rewrite core module' }, 'breaking via !');
assertEq(parseSubject('feat(api)!: change response format'), { type: 'feat', scope: 'api', breaking: true, description: 'change response format' }, 'breaking + scope');
assertEq(parseSubject('docs: update README'), { type: 'docs', scope: null, breaking: false, description: 'update README' }, 'parses docs');
assertEq(parseSubject('chore: bump deps'), { type: 'chore', scope: null, breaking: false, description: 'bump deps' }, 'parses chore');
assertEq(parseSubject('just a regular commit'), null, 'null for non-conventional');
assertEq(parseSubject(''), null, 'null for empty');
assertEq(parseSubject(null), null, 'null for null');
assertEq(parseSubject(undefined), null, 'null for undefined');
assertEq(parseSubject('perf: optimize query'), { type: 'perf', scope: null, breaking: false, description: 'optimize query' }, 'parses perf');
assertEq(parseSubject('test(unit): add coverage'), { type: 'test', scope: 'unit', breaking: false, description: 'add coverage' }, 'parses test');
assertEq(parseSubject('ci: add github actions'), { type: 'ci', scope: null, breaking: false, description: 'add github actions' }, 'parses ci');
assertEq(parseSubject('build: update webpack config'), { type: 'build', scope: null, breaking: false, description: 'update webpack config' }, 'parses build');
assertEq(parseSubject('style: fix indentation'), { type: 'style', scope: null, breaking: false, description: 'fix indentation' }, 'parses style');
console.log('\nextractIssues');
assertEq(extractIssues('fix: resolve #123 bug'), ['123'], 'extracts single issue');
assertEq(extractIssues('feat: add #12 and #34'), ['12', '34'], 'extracts multiple');
assertEq(extractIssues('no issues here'), [], 'empty for no issues');
assertEq(extractIssues('closes #5, fixes #5'), ['5'], 'deduplicates');
assertEq(extractIssues(''), [], 'empty for empty string');
assertEq(extractIssues(null), [], 'empty for null');
console.log('\ndetectBreaking');
var r1 = detectBreaking({ breaking: true, description: 'big change' }, '');
assert(r1.isBreaking === true, 'breaking from !');
assertEq(r1.note, 'big change', 'note from description');
var r2 = detectBreaking({ breaking: false, description: 'small' }, 'BREAKING CHANGE: API removed');
assert(r2.isBreaking === true, 'breaking from body');
assertEq(r2.note, 'API removed', 'note from body');
var r3 = detectBreaking({ breaking: false, description: 'ok' }, 'just a body');
assert(r3.isBreaking === false, 'no breaking when absent');
var r4 = detectBreaking(null, '');
assert(r4.isBreaking === false, 'no breaking for null');
var r5 = detectBreaking({ breaking: false, description: 'test' }, 'BREAKING-CHANGE: new format');
assert(r5.isBreaking === true, 'BREAKING-CHANGE with hyphen');
console.log('\nparseCommit');
var c1 = parseCommit({ hash: 'abc123full', shortHash: 'abc123', author: 'idirdev', email: 'i@e.com', date: '2026-01-15', subject: 'feat(auth): add OAuth2 support #42', body: '' });
assertEq(c1.type, 'feat', 'type parsed');
assertEq(c1.scope, 'auth', 'scope parsed');
assert(c1.isConventional === true, 'is conventional');
assert(c1.isBreaking === false, 'not breaking');
assertEq(c1.issues, ['42'], 'issues extracted');
var c2 = parseCommit({ hash: 'def', shortHash: 'de', author: 'x', email: 'x', date: '', subject: 'random commit', body: '' });
assert(c2.isConventional === false, 'non-conventional');
assertEq(c2.type, null, 'null type');
var c3 = parseCommit({ hash: 'ghi', shortHash: 'gh', author: 'x', email: 'x', date: '', subject: 'fix!: remove deprecated', body: 'BREAKING CHANGE: gone' });
assert(c3.isBreaking === true, 'breaking via ! + body');
console.log('\ngroupByType');
var commits = [
  { type: 'feat', description: 'a', hash: 'h0', shortHash: 's0', author: 'x', email: 'x', date: '', subject: '', body: '', isConventional: true, isBreaking: false, breakingNote: null, issues: [], scope: null },
  { type: 'feat', description: 'b', hash: 'h1', shortHash: 's1', author: 'x', email: 'x', date: '', subject: '', body: '', isConventional: true, isBreaking: false, breakingNote: null, issues: [], scope: null },
  { type: 'fix', description: 'c', hash: 'h2', shortHash: 's2', author: 'x', email: 'x', date: '', subject: '', body: '', isConventional: true, isBreaking: false, breakingNote: null, issues: [], scope: null },
  { type: null, description: 'd', hash: 'h3', shortHash: 's3', author: 'x', email: 'x', date: '', subject: '', body: '', isConventional: false, isBreaking: false, breakingNote: null, issues: [], scope: null },
];
var grouped = groupByType(commits);
assertEq(grouped.get('feat').length, 2, 'groups feat');
assertEq(grouped.get('fix').length, 1, 'groups fix');
assertEq(grouped.get('other').length, 1, 'groups other');
console.log('\nformatCommitLine');
var l1 = formatCommitLine({ scope: 'auth', description: 'add login', shortHash: 'abc', hash: 'abcfull', issues: [] }, {});
assert(l1.indexOf('**auth:**') !== -1, 'scope in bold');
assert(l1.indexOf('add login') !== -1, 'has description');
assert(l1.indexOf('(abc)') !== -1, 'has short hash');
var l2 = formatCommitLine({ scope: null, description: 'fix bug', shortHash: 'def', hash: 'deffull', issues: ['99'] }, { repoUrl: 'https://github.com/idirdev/changelog-gen' });
assert(l2.indexOf('[#99]') !== -1, 'issue link');
assert(l2.indexOf('/issues/99') !== -1, 'issue URL');
assert(l2.indexOf('[def]') !== -1, 'linked hash');
assert(l2.indexOf('/commit/deffull') !== -1, 'commit URL');

console.log('\nResults: ' + passed + ' passed, ' + failed + ' failed\n');
process.exit(failed > 0 ? 1 : 0);
