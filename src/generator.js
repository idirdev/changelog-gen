'use strict';

const { parseCommit, groupByType } = require('./parser');

/**
 * Ordered list of types for display. Types not in this list appear at the end.
 */
const TYPE_ORDER = [
  'feat', 'fix', 'perf', 'refactor', 'docs',
  'style', 'test', 'build', 'ci', 'chore',
];

/**
 * Format a single commit line in markdown.
 *
 * @param {object} commit - Parsed commit
 * @param {object} opts - { repoUrl }
 * @returns {string}
 */
function formatCommitLine(commit, opts = {}) {
  let line = '- ';

  if (commit.scope) {
    line += `**${commit.scope}:** `;
  }

  line += commit.description;

  // Append issue links
  if (commit.issues.length > 0 && opts.repoUrl) {
    const links = commit.issues.map(n => `[#${n}](${opts.repoUrl}/issues/${n})`);
    line += ` (${links.join(', ')})`;
  } else if (commit.issues.length > 0) {
    const refs = commit.issues.map(n => `#${n}`);
    line += ` (${refs.join(', ')})`;
  }

  // Append short hash
  if (commit.shortHash) {
    if (opts.repoUrl) {
      line += ` ([${commit.shortHash}](${opts.repoUrl}/commit/${commit.hash}))`;
    } else {
      line += ` (${commit.shortHash})`;
    }
  }

  return line;
}

/**
 * Generate the markdown for a single version group.
 *
 * @param {object} group - { version, date, commits }
 * @param {object} config - Full config object
 * @returns {string} Markdown section
 */
function generateVersionSection(group, config) {
  const parsed = group.commits.map(c => parseCommit(c));
  const grouped = groupByType(parsed);
  const lines = [];

  // Version header
  const dateStr = group.date ? ` (${group.date})` : '';
  lines.push(`## ${group.version}${dateStr}`);
  lines.push('');

  // Breaking changes first
  const breakingCommits = parsed.filter(c => c.isBreaking);
  if (breakingCommits.length > 0) {
    const breakingLabel = config.breakingLabel || 'BREAKING CHANGES';
    lines.push(`### ${breakingLabel}`);
    lines.push('');
    for (const commit of breakingCommits) {
      const note = commit.breakingNote || commit.description;
      let line = `- `;
      if (commit.scope) line += `**${commit.scope}:** `;
      line += note;
      if (commit.shortHash) {
        if (config.repoUrl) {
          line += ` ([${commit.shortHash}](${config.repoUrl}/commit/${commit.hash}))`;
        } else {
          line += ` (${commit.shortHash})`;
        }
      }
      lines.push(line);
    }
    lines.push('');
  }

  // Sort types in defined order
  const sortedTypes = [...grouped.keys()].sort((a, b) => {
    const ia = TYPE_ORDER.indexOf(a);
    const ib = TYPE_ORDER.indexOf(b);
    const oa = ia === -1 ? 999 : ia;
    const ob = ib === -1 ? 999 : ib;
    return oa - ob;
  });

  for (const type of sortedTypes) {
    const commits = grouped.get(type);
    const typeConf = config.types[type];
    const label = typeConf ? typeConf.label : type.charAt(0).toUpperCase() + type.slice(1);

    // Filter out commits that are only breaking (already shown above)
    const nonBreaking = commits.filter(c => !c.isBreaking);
    // Also include breaking ones in their type section for completeness
    const toShow = commits;

    if (toShow.length === 0) continue;

    lines.push(`### ${label}`);
    lines.push('');

    for (const commit of toShow) {
      lines.push(formatCommitLine(commit, { repoUrl: config.repoUrl }));
    }

    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Generate the full CHANGELOG markdown from version groups.
 *
 * @param {object[]} groups - Array of { version, date, commits }
 * @param {object} config - Full config object
 * @returns {string} Complete markdown
 */
function generateChangelog(groups, config) {
  const sections = [];

  // Header
  if (config.header) {
    sections.push(config.header);
  }

  // Each version
  for (const group of groups) {
    if (group.commits.length === 0) continue;
    sections.push(generateVersionSection(group, config));
  }

  return sections.join('\n').trim() + '\n';
}

module.exports = {
  generateChangelog,
  generateVersionSection,
  formatCommitLine,
  TYPE_ORDER,
};
