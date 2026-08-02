# video

Ultracite release videos, built with [Remotion](https://www.remotion.dev).

## Commands

Start the studio preview:

```console
bun run dev
```

Render a composition:

```console
bun x remotion render FixCodexVideo out/fix-codex.mp4
```

## Structure

- `src/root.tsx` — registers every composition
- `src/fix-codex-composition.tsx` — the Ultracite 7.10 `ultracite fix --codex` release cut
- `src/scenes/` — scene components specific to individual videos
- `src/components/remocn/` — reusable motion primitives (typewriter, blur-ins, terminal chrome, transitions)
- `src/lib/remocn-ui/` — shared motion/theme/timeline helpers
