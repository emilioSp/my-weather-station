import { describe, it } from 'vitest';
import { toCamelCaseKeys } from './caseMapper.util.ts';

describe('caseMapper', () => {
  it('returns a string converted to camel case', () => {
    toCamelCaseKeys('ciao');
  });
});
