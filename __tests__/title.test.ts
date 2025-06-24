import { describe, expect, it } from 'vitest';
import { title } from '../scripts/title';

// Define regex patterns at the top level for performance
const EIGHT_PATTERN = /8+/;
const DIGIT_PATTERN = /\d+/;

describe('title', () => {
  it('should export the ASCII art title as a string', () => {
    expect(typeof title).toBe('string');
    expect(title).toContain('888'); // The title contains ASCII art with 888 patterns
    expect(title.trim()).toBeTruthy();
  });

  it('should contain the expected ASCII art structure', () => {
    const lines = title.trim().split('\n');
    expect(lines.length).toBeGreaterThan(1);

    // Check that it contains numbers/characters typical of ASCII art
    expect(title).toMatch(EIGHT_PATTERN);
    expect(title).toMatch(DIGIT_PATTERN);
  });

  it('should be consistently formatted', () => {
    // Ensure it starts and ends with newlines for proper display
    expect(title.startsWith('\n')).toBe(true);
    expect(title.endsWith('\n')).toBe(true);
  });
});
