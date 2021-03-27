'use strict';

const { execSync } = require('child_process');

const LOG_SEPARATOR = '---COMMIT_END---';
const FIELD_SEPARATOR = '---FIELD---';

/**
 * Verify we are inside a git repository.
 */
function assertGitRepo(cwd) {
  try {
    execSync('git rev-parse --is-inside-work-tree', {
      cwd,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch {
    throw new Error('Not a git repository. Run this command from within a git project.');
  }
}

/**
 * Retrieve all version tags sorted by semver-like order (most recent first).
 * Returns array of { tag, hash, date }.
 */
function getTags(cwd) {
  try {
    const raw = execSync(
      'git tag -l --sort=-version:refname --format="%(refname:short)---FIELD---%(objectname:short)---FIELD---%(creatordate:iso-strict)"',
      { cwd, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
    ).trim();

    if (!raw) return [];

    return raw.split('\n').filter(Boolean).map(line => {
      const [tag, hash, date] = line.split(FIELD_SEPARATOR);
      return { tag: tag.trim(), hash: hash.trim(), date: date.trim() };
    });
  } catch {
    return [];
  }
}

/**
 * Build a git log command with the given range and optional date filters.
 */
function buildLogCommand(range, opts = {}) {
  const format = [
    '%H',           // full hash
    '%h',           // short hash
    '%an',          // author name
    '%ae',          // author email
    '%aI',          // author date ISO
    '%s',           // subject
    '%b',           // body
  ].join(FIELD_SEPARATOR);

  let cmd = `git log --format="${format}${LOG_SEPARATOR}"`;

  if (range) {
    cmd += ` ${range}`;
  }

  if (opts.since) {
    cmd += ` --since="${opts.since}"`;
  }
  if (opts.until) {
    cmd += ` --until="${opts.until}"`;
  }

  return cmd;
}

/**
 * Parse raw git log output into structured commit objects.
 */
function parseRawLog(raw) {
  if (!raw || !raw.trim()) return [];

  const commits = [];
  const chunks = raw.split(LOG_SEPARATOR).filter(c => c.trim());

  for (const chunk of chunks) {
    const fields = chunk.trim().split(FIELD_SEPARATOR);
    if (fields.length < 6) continue;

    commits.push({
      hash: fields[0].trim(),
      shortHash: fields[1].trim(),
      author: fields[2].trim(),
      email: fields[3].trim(),
      date: fields[4].trim(),
      subject: fields[5].trim(),
      body: (fields[6] || '').trim(),
    });
  }

  return commits;
}

/**
 * Get commits between two refs (tag..tag or tag..HEAD).
 */
function getCommits(cwd, range, opts = {}) {
  const cmd = buildLogCommand(range, opts);
  try {
    const raw = execSync(cmd, {
      cwd,
      encoding: 'utf-8',
      maxBuffer: 50 * 1024 * 1024,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return parseRawLog(raw);
  } catch {
    return [];
  }
}

/**
 * Group commits by version tags. Returns an array of version groups:
 * [{ version, date, commits }, ...]
 * The first group is always "Unreleased" (HEAD..latest tag).
 */
function groupByTags(cwd, opts = {}) {
  assertGitRepo(cwd);

  const tags = getTags(cwd);
  const groups = [];

  // Unreleased: from latest tag to HEAD
  if (tags.length > 0) {
    const unreleased = getCommits(cwd, `${tags[0].tag}..HEAD`, opts);
    if (unreleased.length > 0) {
      groups.push({
        version: 'Unreleased',
        date: new Date().toISOString().slice(0, 10),
        commits: unreleased,
      });
    }

    // Between consecutive tags
    for (let i = 0; i < tags.length; i++) {
      const current = tags[i];
      const next = tags[i + 1];
      const range = next ? `${next.tag}..${current.tag}` : current.tag;
      const commits = getCommits(cwd, range, opts);

      groups.push({
        version: current.tag,
        date: current.date ? current.date.slice(0, 10) : '',
        commits,
      });
    }
  } else {
    // No tags: all commits
    const all = getCommits(cwd, null, opts);
    if (all.length > 0) {
      groups.push({
        version: 'Unreleased',
        date: new Date().toISOString().slice(0, 10),
        commits: all,
      });
    }
  }

  return groups;
}

module.exports = {
  assertGitRepo,
  getTags,
  getCommits,
  groupByTags,
  parseRawLog,
  buildLogCommand,
};
