#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const specsDir = dirname(import.meta.dirname);
const id = process.argv[2];

if (!id || !/^[0-9a-f]{12}-[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) {
  console.error('Usage: .specs/scripts/record-builder.js <spec-id>');
  console.error('A spec id is 12 hex characters, a hyphen, then the slug.');
  process.exit(1);
}

const specDir = join(specsDir, id);

if (!existsSync(specDir)) {
  console.error(`Spec not found: .specs/${id}`);
  process.exit(1);
}

const handoffsDir = join(specDir, 'handoffs');
const template = readFileSync(join(specsDir, 'templates/builder.json'), 'utf8');

mkdirSync(handoffsDir, { recursive: true });
writeFileSync(
  join(handoffsDir, 'builder.json'),
  template.replaceAll('<id>', id),
);

console.log(`Wrote .specs/${id}/handoffs/builder.json`);
