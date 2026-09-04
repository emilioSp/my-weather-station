#!/usr/bin/env node
import { randomUUIDv7 } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const specsDir = dirname(import.meta.dirname);
const slug = process.argv[2];

if (!slug || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
  console.error('Usage: .specs/scripts/new-spec.js <spec-slug>');
  console.error('A slug is lower case words joined by hyphens.');
  process.exit(1);
}

const uuid = randomUUIDv7();
const id = `${uuid.slice(0, 8)}${uuid.slice(9, 13)}-${slug}`;
const specDir = join(specsDir, id);

if (existsSync(specDir)) {
  console.error(`Spec already exists: .specs/${id}`);
  process.exit(1);
}

const template = readFileSync(join(specsDir, 'templates/spec.md'), 'utf8');

mkdirSync(specDir, { recursive: true });
writeFileSync(join(specDir, 'spec.md'), template.replaceAll('<id>', id));

console.log(`Created .specs/${id}/spec.md`);
