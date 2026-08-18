import { describe, it, expect } from 'vitest';
import { matchesWildcard } from './wildcardMatcher';

describe('matchesWildcard', () => {
  it('matches exactly, case-insensitively', () => {
    expect(matchesWildcard('Microsoft.Storage/read', 'Microsoft.Storage/read')).toBe(true);
    expect(matchesWildcard('microsoft.storage/read', 'Microsoft.Storage/READ')).toBe(true);
    expect(matchesWildcard('Microsoft.Storage/read', 'Microsoft.Storage/write')).toBe(false);
  });

  it('treats a bare asterisk as matching everything', () => {
    expect(matchesWildcard('*', 'Microsoft.Compute/virtualMachines/read')).toBe(true);
  });

  it('expands wildcards mid-pattern', () => {
    expect(matchesWildcard('Microsoft.Storage/*', 'Microsoft.Storage/storageAccounts/read')).toBe(true);
    expect(matchesWildcard('Microsoft.Storage/*', 'Microsoft.Compute/read')).toBe(false);
    expect(matchesWildcard('*/read', 'Microsoft.Compute/virtualMachines/read')).toBe(true);
    expect(matchesWildcard('*/read', 'Microsoft.Compute/virtualMachines/write')).toBe(false);
    expect(matchesWildcard('Microsoft.*/virtualMachines/*', 'Microsoft.Compute/virtualMachines/start/action')).toBe(true);
  });

  // A literal '.' must not behave as the regex any-character class.
  it('treats dots as literals', () => {
    expect(matchesWildcard('Microsoft.Storage/read', 'MicrosoftXStorage/read')).toBe(false);
  });

  it('does not let regex metacharacters in a pattern change the match', () => {
    expect(matchesWildcard('Microsoft.Storage/read+', 'Microsoft.Storage/read')).toBe(false);
    expect(matchesWildcard('Microsoft.(Storage)/read', 'Microsoft.Storage/read')).toBe(false);
    expect(matchesWildcard('Microsoft.Storage/re[ad]', 'Microsoft.Storage/read')).toBe(false);
  });

  it('anchors the whole string', () => {
    expect(matchesWildcard('Microsoft.Storage', 'Microsoft.Storage/read')).toBe(false);
    expect(matchesWildcard('Storage/read', 'Microsoft.Storage/read')).toBe(false);
  });

  it('rejects empty inputs', () => {
    expect(matchesWildcard('', 'Microsoft.Storage/read')).toBe(false);
    expect(matchesWildcard('Microsoft.Storage/read', '')).toBe(false);
  });

  // The regex cache is keyed on the pattern; repeated calls must stay stable.
  it('returns the same answer when a cached pattern is reused', () => {
    for (let i = 0; i < 3; i++) {
      expect(matchesWildcard('Microsoft.Storage/*/read', 'Microsoft.Storage/blobs/read')).toBe(true);
      expect(matchesWildcard('Microsoft.Storage/*/read', 'Microsoft.Storage/blobs/write')).toBe(false);
    }
  });
});
