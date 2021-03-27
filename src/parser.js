'use strict';

/**
 * Regex to match a conventional commit subject line:
 *   type(scope)!: description
 * The scope and ! (breaking) are optional.
 */
const CONVENTIONAL_RE = /^(\w+)(?:\(([^)]*)\))?(!)?\s*:\s*(.+)$/;

/**
 * Regex to detect issue references like #123, GH-456, etc.
 */
const ISSUE_RE = /#(\d+)/g;

/**
 * Regex to detect BREAKING CHANGE in commit body.
 */
const BREAKING_BODY_RE = /^BREAKING[ -]CHANGE\s*:\s*(.+)/m;

/**
 * Parse a single commit subject into a structured object.
 *
 * @param {string} subject - The commit subject line
 * @returns {object|null} Parsed commit or null if not conventional
 */
function parseSubject(subject) {
  if (!subject || typeof subject !== 'string') return null;

  const match = subject.match(CONVENTIONAL_RE);
  if (!match) return null;

  const [, type, scope, bang, description] = match;

  return {
    type: type.toLowerCase(),
    scope: scope || null,
    breaking: !!bang,
    description: description.trim(),
  };
}

/**
 * Extract issue references from a string.
 *
 * @param {string} text
 * @returns {string[]} Array of issue numbers (as strings)
 */
function extractIssues(text) {
  if (!text) return [];
  const issues = [];
  let m;
  while ((m = ISSUE_RE.exec(text)) !== null) {
    issues.push(m[1]);
  }
  // Reset regex state
  ISSUE_RE.lastIndex = 0;
  return [...new Set(issues)];
}

/**
 * Check if a commit has a breaking change, either via ! in type or
 * BREAKING CHANGE: in the body.
 *
 * @param {object} parsed - Result of parseSubject
 * @param {string} body - Full commit body
 * @returns {{ isBreaking: boolean, note: string|null }}
 */
function detectBreaking(parsed, body) {
  if (!parsed) return { isBreaking: false, note: null };

  if (parsed.breaking) {
    return { isBreaking: true, note: parsed.description };
  }

  if (body) {
    const match = body.match(BREAKING_BODY_RE);
    if (match) {
      return { isBreaking: true, note: match[1].trim() };
    }
  }

  return { isBreaking: false, note: null };
}

/**
 * Parse a full commit object (with subject, body, hash, etc.) into
 * a rich structured commit.
 *
 * @param {object} commit - Raw commit { hash, shortHash, author, email, date, subject, body }
 * @returns {object} Parsed commit with type, scope, description, issues, breaking info
 */
function parseCommit(commit) {
  const parsed = parseSubject(commit.subject);
  const issues = extractIssues(commit.subject + ' ' + (commit.body || ''));
  const breaking = detectBreaking(parsed, commit.body);

  return {
    hash: commit.hash,
    shortHash: commit.shortHash,
    author: commit.author,
    email: commit.email,
    date: commit.date,
    subject: commit.subject,
    body: commit.body,
    type: parsed ? parsed.type : null,
    scope: parsed ? parsed.scope : null,
    description: parsed ? parsed.description : commit.subject,
    isConventional: !!parsed,
    isBreaking: breaking.isBreaking,
    breakingNote: breaking.note,
    issues,
  };
}

/**
 * Group an array of parsed commits by their type.
 * Non-conventional commits go under 'other'.
 *
 * @param {object[]} commits - Array of parsed commits
 * @returns {Map<string, object[]>} Map of type -> commits
 */
function groupByType(commits) {
  const groups = new Map();

  for (const commit of commits) {
    const key = commit.type || 'other';
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(commit);
  }

  return groups;
}

module.exports = {
  parseSubject,
  extractIssues,
  detectBreaking,
  parseCommit,
  groupByType,
  CONVENTIONAL_RE,
  ISSUE_RE,
};
