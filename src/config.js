'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULT_CONFIG = {
  types: {
    feat:     { label: 'Features',             emoji: '' },
    fix:      { label: 'Bug Fixes',            emoji: '' },
    docs:     { label: 'Documentation',         emoji: '' },
    style:    { label: 'Styles',               emoji: '' },
    refactor: { label: 'Code Refactoring',     emoji: '' },
    perf:     { label: 'Performance',           emoji: '' },
    test:     { label: 'Tests',                emoji: '' },
    build:    { label: 'Build System',          emoji: '' },
    ci:       { label: 'CI/CD',                emoji: '' },
    chore:    { label: 'Chores',               emoji: '' },
  },
  breakingLabel: 'BREAKING CHANGES',
  output: 'CHANGELOG.md',
  repoUrl: null,
  dateFormat: 'short',   // 'short' = YYYY-MM-DD, 'long' = full locale string
  header: '# Changelog\n\nAll notable changes to this project will be documented in this file.\n',
  append: false,
};

/**
 * Attempts to load a config file from the project root.
 * Supported names: .changelogrc, .changelogrc.json, changelog.config.js
 * Falls back to DEFAULT_CONFIG for any missing keys.
 */
function loadConfig(cwd) {
  const candidates = [
    '.changelogrc',
    '.changelogrc.json',
    'changelog.config.js',
  ];

  for (const name of candidates) {
    const filePath = path.join(cwd, name);
    if (!fs.existsSync(filePath)) continue;

    try {
      if (name.endsWith('.js')) {
        const userConf = require(filePath);
        return mergeConfig(userConf);
      }
      const raw = fs.readFileSync(filePath, 'utf-8');
      const userConf = JSON.parse(raw);
      return mergeConfig(userConf);
    } catch (err) {
      // Silently ignore malformed config; use defaults
    }
  }

  return { ...DEFAULT_CONFIG };
}

function mergeConfig(userConf) {
  return {
    ...DEFAULT_CONFIG,
    ...userConf,
    types: {
      ...DEFAULT_CONFIG.types,
      ...(userConf.types || {}),
    },
  };
}

/**
 * Detect the remote GitHub/GitLab URL from git config.
 */
function detectRepoUrl(cwd) {
  try {
    const { execSync } = require('child_process');
    const raw = execSync('git config --get remote.origin.url', {
      cwd,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();

    // Convert SSH to HTTPS
    let url = raw;
    if (url.startsWith('git@')) {
      url = url.replace(':', '/').replace('git@', 'https://');
    }
    if (url.endsWith('.git')) {
      url = url.slice(0, -4);
    }
    return url || null;
  } catch {
    return null;
  }
}

module.exports = { loadConfig, detectRepoUrl, DEFAULT_CONFIG, mergeConfig };
