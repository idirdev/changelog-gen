'use strict';

/**
 * @module changelog-gen
 * @description Generate changelogs from git commit history using conventional commits.
 * @author idirdev
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Mapping from conventional commit type codes to human-readable section titles.
 * @constant {Object.<string, string>}
 */
const COMMIT_TYPES = {
  feat: 'Features',
  fix: 'Bug Fixes',
  docs: 'Documentation',
  style: 'Styles',
  refactor: 'Code Refactoring',
  perf: 'Performance Improvements',
  test: 'Tests',
  build: 'Build System',
  ci: 'CI',
  chore: 'Chores',
  revert: 'Reverts',
};

/**
 * Parse a conventional commit message into its semantic components.
 * Supported format: type(scope)!: subject
 * @param {string} message - Raw commit subject line.
 * @returns {{ type: string, scope: string|null, subject: string, breaking: boolean, raw: string }}
 */
function parseConventionalCommit(message) {
  const raw = (message || '').trim();
  const re = /^([a-z]+)(\(([^)]+)\))?(!)?: (.+)/;
  const m = raw.match(re);

  if (!m) {
    return { type: 'other', scope: null, subject: raw, breaking: false, raw };
  }

  const type = m[1].toLowerCase();
  const scope = m[3] || null;
  const bang = m[4] === '!';
  const subject = m[5].trim();
  const breaking = bang || /BREAKING[ -]CHANGE/i.test(raw);

  return { type, scope, subject, breaking, raw };
}

/**
 * Run git log and return parsed commit objects.
 * @param {Object} [opts={}] - Options.
 * @param {string} [opts.from] - Starting ref (exclusive).
 * @param {string} [opts.to='HEAD'] - Ending ref (inclusive).
 * @param {string} [opts.cwd] - Working directory for git.
 * @returns {Object[]} Array of parsed commit objects.
 * @throws {Error} If git log fails.
 */
function getCommits(opts) {
  const { from, to = 'HEAD', cwd = process.cwd() } = opts || {};
  const range = from ? (from + '..' + to) : to;
  const cmd = 'git log ' + range + ' --pretty=format:%s --no-merges';

  let output;
  try {
    output = execSync(cmd, { cwd, stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
  } catch (err) {
    throw new Error('git log failed: ' + (err.message || String(err)));
  }

  if (!output) return [];

  return output
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map(parseConventionalCommit);
}

/**
 * Group parsed commits by their section title derived from COMMIT_TYPES.
 * @param {Object[]} commits - Array of parsed commit objects.
 * @returns {Object.<string, Object[]>} Map of section title → commit[].
 */
function groupByType(commits) {
  const groups = {};
  for (const c of commits) {
    const title = COMMIT_TYPES[c.type] || 'Other Changes';
    if (!groups[title]) groups[title] = [];
    groups[title].push(c);
  }
  return groups;
}

/**
 * Read the version string from package.json in the given directory.
 * @param {string} dir - Directory containing package.json.
 * @returns {string} Version string, or '0.0.0' if not found.
 */
function getVersionFromPackage(dir) {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
    return data.version || '0.0.0';
  } catch {
    return '0.0.0';
  }
}

/**
 * Retrieve git tags sorted by version in descending order.
 * @param {string} [cwd] - Working directory.
 * @returns {string[]} Sorted tag names.
 */
function getTaggedVersions(cwd) {
  const dir = cwd || process.cwd();
  try {
    const out = execSync('git tag --sort=-version:refname', {
      cwd: dir, stdio: ['pipe', 'pipe', 'pipe'],
    }).toString().trim();
    return out ? out.split('\n').map((t) => t.trim()).filter(Boolean) : [];
  } catch {
    return [];
  }
}

/**
 * Generate a markdown changelog section from an array of parsed commits.
 * @param {Object[]} commits - Array of parsed commit objects.
 * @param {Object} [opts={}] - Generation options.
 * @param {string} [opts.version] - Version label for the section header.
 * @param {string} [opts.date] - ISO date string (defaults to today).
 * @returns {string} Markdown changelog section.
 */
function generateChangelog(commits, opts) {
  const { version = 'Unreleased', date = new Date().toISOString().slice(0, 10) } = opts || {};

  if (!commits.length) {
    return '## [' + version + '] - ' + date + '\n\n_No changes._\n';
  }

  const lines = ['## [' + version + '] - ' + date + '\n'];

  // Breaking changes get their own section at the top.
  const breaking = commits.filter((c) => c.breaking);
  if (breaking.length) {
    lines.push('### BREAKING CHANGES\n');
    for (const c of breaking) {
      const scope = c.scope ? '**' + c.scope + ':** ' : '';
      lines.push('- ' + scope + c.subject);
    }
    lines.push('');
  }

  const groups = groupByType(commits);
  const seen = new Set();

  // Emit sections in canonical order, then any remaining.
  const orderedTitles = Object.values(COMMIT_TYPES).concat(Object.keys(groups));
  for (const title of orderedTitles) {
    if (seen.has(title) || !groups[title]) continue;
    seen.add(title);
    lines.push('### ' + title + '\n');
    for (const c of groups[title]) {
      const scope = c.scope ? '**' + c.scope + ':** ' : '';
      const bang = c.breaking ? ' (**BREAKING**)' : '';
      lines.push('- ' + scope + c.subject + bang);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Generate a changelog for a specific commit range.
 * @param {string} fromTag - Starting ref (exclusive).
 * @param {string} toTag - Ending ref (inclusive).
 * @param {Object} [opts={}] - Options forwarded to generateChangelog.
 * @returns {string} Markdown changelog section.
 */
function generateFromRange(fromTag, toTag, opts) {
  const commits = getCommits({ from: fromTag, to: toTag });
  return generateChangelog(commits, opts);
}

module.exports = {
  COMMIT_TYPES,
  parseConventionalCommit,
  getCommits,
  groupByType,
  generateChangelog,
  getVersionFromPackage,
  getTaggedVersions,
  generateFromRange,
};
