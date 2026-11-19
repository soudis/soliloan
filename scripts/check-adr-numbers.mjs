#!/usr/bin/env node
// Fails when two ADRs in docs/adr/ share a number (e.g. two PRs both added 0007).
// Gaps are allowed: renumbering after a merge of `main` can leave them.
// Usage: node scripts/check-adr-numbers.mjs [dir]   (default: docs/adr)
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';

/** Returns the ADR numbers used by more than one file, with those files. */
export function findDuplicateAdrNumbers(fileNames) {
  const byNumber = new Map();
  for (const name of fileNames) {
    const match = /^(\d+)-.*\.md$/.exec(name);
    if (!match) continue;
    const number = Number(match[1]);
    byNumber.set(number, [...(byNumber.get(number) ?? []), name]);
  }
  return [...byNumber].filter(([, names]) => names.length > 1);
}

// Self-check: a broken check would let every duplicate through silently.
assert.deepEqual(findDuplicateAdrNumbers(['0001-a.md', '0003-b.md', 'README.md']), []);
assert.deepEqual(findDuplicateAdrNumbers(['0006-a.md', '0006-b.md', '0007-c.md', '6-d.md']), [
  [6, ['0006-a.md', '0006-b.md', '6-d.md']],
]);

const dir = process.argv[2] ?? 'docs/adr';
const duplicates = findDuplicateAdrNumbers(readdirSync(dir).sort());
if (duplicates.length > 0) {
  console.error(`Duplicate ADR numbers in ${dir}:`);
  for (const [number, names] of duplicates) console.error(`  ${number}: ${names.join(', ')}`);
  console.error("Renumber your branch's ADRs past main's highest (docs/agents/workflow.md, ADR numbers).");
  process.exit(1);
}
console.log(`ADR numbers in ${dir} are unique.`);
