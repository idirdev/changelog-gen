#!/usr/bin/env node
'use strict';

/**
 * @file cli.js
 * @description CLI entry point for changelog-gen.
 * @usage changelog-gen [--from tag] [--to HEAD] [--version 1.2.0] [--output CHANGELOG.md] [--json]
 * @author idirdev
 */

const fs = require('fs');
const path = require('path');
const { getCommits, generateChangelog, getVersionFromPackage } = require('../src/index.js');

const args = process.argv.slice(2);
const flags = {};

for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith('--')) {
    const key = args[i].slice(2);
    const next = args[i + 1];
    if (next && !next.startsWith('--')) {
      flags[key] = next;
      i++;
    } else {
      flags[key] = true;
    }
  }
}

const cwd = process.cwd();
const fromTag = typeof flags.from === 'string' ? flags.from : null;
const toRef = typeof flags.to === 'string' ? flags.to : 'HEAD';
const version = typeof flags.version === 'string' ? flags.version : getVersionFromPackage(cwd);
const outputFile = typeof flags.output === 'string' ? flags.output : null;
const asJson = flags.json === true;

let commits;
try {
  commits = getCommits({ from: fromTag, to: toRef, cwd });
} catch (err) {
  console.error('Error:', err.message);
  process.exit(1);
}

if (asJson) {
  const out = JSON.stringify(commits, null, 2);
  if (outputFile) {
    fs.writeFileSync(path.resolve(outputFile), out);
    console.log('Written JSON to', outputFile);
  } else {
    process.stdout.write(out + '\n');
  }
  process.exit(0);
}

const content = generateChangelog(commits, { version });

if (outputFile) {
  fs.writeFileSync(path.resolve(outputFile), content);
  console.log('Written changelog to', outputFile);
} else {
  process.stdout.write(content);
}
