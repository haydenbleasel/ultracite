import { vi } from 'vitest';

// Mock node:child_process
vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
}));

// Mock node:fs/promises
vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  access: vi.fn(),
}));

// Mock @clack/prompts
vi.mock('@clack/prompts', () => ({
  intro: vi.fn(),
  log: {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
  multiselect: vi.fn(),
  select: vi.fn(),
  spinner: vi.fn(() => ({
    start: vi.fn(),
    stop: vi.fn(),
    message: vi.fn(),
  })),
}));

// Mock process
Object.defineProperty(process, 'exit', {
  value: vi.fn(),
});
