import { type TrpcCliMeta, trpcServer } from 'trpc-cli';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import z from 'zod';

// Mock the command modules
const mockFormat = vi.fn();
const mockInitialize = vi.fn();
const mockLint = vi.fn();

vi.mock('../scripts/format', () => ({
  format: mockFormat,
}));

vi.mock('../scripts/initialize', () => ({
  initialize: mockInitialize,
}));

vi.mock('../scripts/lint', () => ({
  lint: mockLint,
}));

// Mock package.json
vi.mock('../package.json', () => ({
  default: {
    version: 'test-version',
  },
}));

function createTestRouter() {
  const t = trpcServer.initTRPC.meta<TrpcCliMeta>().create();

  return t.router({
    init: t.procedure
      .meta({
        description: 'Initialize Ultracite in the current directory',
      })
      .input(
        z.object({
          pm: z
            .enum(['pnpm', 'bun', 'yarn', 'npm'])
            .optional()
            .describe('Package manager to use'),
          editors: z
            .array(z.enum(['vscode', 'zed']))
            .optional()
            .describe('Editors to configure'),
          rules: z
            .array(
              z.enum([
                'vscode-copilot',
                'cursor',
                'windsurf',
                'zed',
                'claude',
                'codex',
                'kiro',
              ])
            )
            .optional()
            .describe('Editor rules to enable'),
          features: z
            .array(z.enum(['husky', 'lefthook', 'lint-staged']))
            .optional()
            .describe('Additional features to enable'),
          removePrettier: z
            .boolean()
            .optional()
            .describe('Remove Prettier dependencies and configuration'),
          removeEslint: z
            .boolean()
            .optional()
            .describe('Remove ESLint dependencies and configuration'),
        })
      )
      .mutation(async ({ input }) => {
        await mockInitialize(input);
      }),

    lint: t.procedure
      .meta({
        description: 'Run Biome linter without fixing files',
      })
      .input(
        z
          .array(z.string())
          .optional()
          .default([])
          .describe('specific files to lint')
      )
      .query(({ input }) => {
        mockLint(input);
      }),

    format: t.procedure
      .meta({
        description: 'Run Biome linter and fixes files',
      })
      .input(
        z.tuple([
          z
            .array(z.string())
            .optional()
            .default([])
            .describe('specific files to format'),
          z.object({
            unsafe: z.boolean().optional().describe('apply unsafe fixes'),
          }),
        ])
      )
      .mutation(({ input }) => {
        const [files, options] = input;
        mockFormat(files, { unsafe: options.unsafe });
      }),
  });
}

describe('CLI Router', () => {
  let router: ReturnType<typeof createTestRouter>;

  beforeEach(() => {
    vi.clearAllMocks();
    router = createTestRouter();
  });

  describe('init procedure', () => {
    it('should call initialize with provided options', async () => {
      const caller = router.createCaller({});
      const input = {
        pm: 'pnpm' as const,
        editors: ['vscode' as const],
        rules: ['cursor' as const],
        features: ['husky' as const],
        removePrettier: true,
        removeEslint: false,
      };

      await caller.init(input);

      expect(mockInitialize).toHaveBeenCalledWith(input);
    });

    it('should call initialize with empty object when no options provided', async () => {
      const caller = router.createCaller({});

      await caller.init({});

      expect(mockInitialize).toHaveBeenCalledWith({});
    });

    it('should validate package manager enum', async () => {
      const caller = router.createCaller({});

      await expect(caller.init({ pm: 'invalid' as never })).rejects.toThrow();
    });

    it('should validate editors array', async () => {
      const caller = router.createCaller({});

      await expect(
        caller.init({ editors: ['invalid'] as never })
      ).rejects.toThrow();
    });

    it('should validate rules array', async () => {
      const caller = router.createCaller({});

      await expect(
        caller.init({ rules: ['invalid'] as never })
      ).rejects.toThrow();
    });

    it('should validate features array', async () => {
      const caller = router.createCaller({});

      await expect(
        caller.init({ features: ['invalid'] as never })
      ).rejects.toThrow();
    });
  });

  describe('lint procedure', () => {
    it('should call lint with provided files', async () => {
      const caller = router.createCaller({});
      const files = ['src/index.ts', 'src/utils.ts'];

      await caller.lint(files);

      expect(mockLint).toHaveBeenCalledWith(files);
    });

    it('should call lint with empty array when no files provided', async () => {
      const caller = router.createCaller({});

      await caller.lint();

      expect(mockLint).toHaveBeenCalledWith([]);
    });

    it('should validate that input is array of strings', async () => {
      const caller = router.createCaller({});

      await expect(caller.lint([123] as never)).rejects.toThrow();
    });
  });

  describe('format procedure', () => {
    it('should call format with provided files and options', async () => {
      const caller = router.createCaller({});
      const files = ['src/index.ts'];
      const options = { unsafe: true };

      await caller.format([files, options]);

      expect(mockFormat).toHaveBeenCalledWith(files, options);
    });

    it('should call format with empty files and default options', async () => {
      const caller = router.createCaller({});

      await caller.format([[], {}]);

      expect(mockFormat).toHaveBeenCalledWith([], {});
    });

    it('should handle unsafe option being undefined', async () => {
      const caller = router.createCaller({});
      const files = ['src/index.ts'];

      await caller.format([files, {}]);

      expect(mockFormat).toHaveBeenCalledWith(files, {});
    });

    it('should validate input format', async () => {
      const caller = router.createCaller({});

      await expect(caller.format(['invalid'] as never)).rejects.toThrow();
    });
  });
});
