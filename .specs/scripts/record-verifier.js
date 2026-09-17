#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const specsDir = dirname(import.meta.dirname);
const id = process.argv[2];

if (!id || !/^\d{17}-[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) {
  console.error('Usage: .specs/scripts/record-verifier.js <spec-id>');
  console.error('A spec id is a UTC creation timestamp and a slug.');
  process.exit(1);
}

const specDir = join(specsDir, id);

if (!existsSync(specDir)) {
  console.error(`Spec not found: .specs/${id}`);
  process.exit(1);
}

const handoffsDir = join(specDir, 'handoffs');
const template = readFileSync(
  join(specsDir, 'templates/verifier.json'),
  'utf8',
);

mkdirSync(handoffsDir, { recursive: true });
writeFileSync(
  join(handoffsDir, 'verifier.json'),
  template.replaceAll('<id>', id),
);

console.log(`Wrote .specs/${id}/handoffs/verifier.json`);
