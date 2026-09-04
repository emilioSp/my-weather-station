#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const specsDir = dirname(import.meta.dirname);
const id = process.argv[2];

if (!id || !/^[0-9a-f]{12}-[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) {
  console.error('Usage: .specs/scripts/open-escalation.js <spec-id>');
  console.error('A spec id is 12 hex characters, a hyphen, then the slug.');
  process.exit(1);
}

const specDir = join(specsDir, id);

if (!existsSync(specDir)) {
  console.error(`Spec not found: .specs/${id}`);
  process.exit(1);
}

const handoffsDir = join(specDir, 'handoffs');
let n = 1;

while (existsSync(join(handoffsDir, `escalation.${n}.json`))) {
  n += 1;
}

const template = readFileSync(
  join(specsDir, 'templates/escalation.json'),
  'utf8',
);

mkdirSync(handoffsDir, { recursive: true });
writeFileSync(
  join(handoffsDir, `escalation.${n}.json`),
  template.replaceAll('<id>', id),
);

console.log(`Wrote .specs/${id}/handoffs/escalation.${n}.json`);
