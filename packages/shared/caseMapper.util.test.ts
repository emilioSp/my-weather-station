// Verify primitive values remain unchanged when mapping database keys.

import { toCamelCaseKeys } from '@wx/shared';
import { describe, expect, it } from 'vitest';

describe('caseMapper', () => {
  it('given a string value when mapping keys to camel case then preserves the string', () => {
    expect(toCamelCaseKeys('ciao')).toBe('ciao');
  });
});
