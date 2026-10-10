### Corpus

| Repo | Commit | Included dirs | Files | Lines | Functions | Nested fns | Mean | Median | p95 | Max |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| zod | `284243fb0d` | `packages/zod/src` | 125 | 37,903 | 2,377 | 32.77% | 2.04 | 0 | 12.2 | 185 |
| hono | `f78a245abc` | `src` | 187 | 25,540 | 1,180 | 44.58% | 3.03 | 0 | 13 | 228 |
| trpc | `796700d865` | `packages/client/src`<br>`packages/next/src`<br>`packages/openapi/src`<br>`packages/react-query/src`<br>`packages/server/src`<br>`packages/tanstack-react-query/src`<br>`packages/upgrade/src` | 176 | 25,948 | 1,245 | 64.90% | 1.23 | 0 | 5 | 33 |
| vite | `3b72997d42` | `packages/vite/src` | 124 | 45,885 | 2,336 | 53.81% | 2.96 | 0 | 13 | 192 |
| astro | `9050e3819c` | `packages/astro/src` | 635 | 82,969 | 4,014 | 43.35% | 2.37 | 0 | 11 | 323 |
| excalidraw | `4c00f31ddc` | `packages/excalidraw`<br>`packages/element/src`<br>`packages/common/src`<br>`packages/math/src`<br>`packages/utils/src` | 444 | 128,127 | 5,408 | 48.58% | 2.56 | 0 | 11 | 167 |
| next.js | `d8bfc3c994` | `packages/next/src` | 1,416 | 276,128 | 10,136 | 46.09% | 3.4 | 0 | 14 | 989 |
| vscode | `959031245e` | `src/vs/editor/common` | 226 | 71,809 | 4,208 | 13.45% | 2.5 | 0 | 12 | 140 |
| ultracite | `250f03b76d` | `packages/cli/src` | 50 | 13,020 | 712 | 36.80% | 1.87 | 0 | 9 | 52 |

Pooled, 8 external repos: 30,904 functions (12,975 nested, 41.98%); cognitive mean 2.76, median 0, p90 6, p95 12, p99 35, max 989.

### Cognitive complexity distribution (share of functions per bucket)

| Repo | 0 | 1-5 | 6-10 | 11-15 | 16-20 | 21-30 | 31-50 | 51+ | n |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| zod | 71.77% | 19.90% | 2.82% | 1.18% | 0.38% | 2.99% | 0.63% | 0.34% | 2,377 |
| hono | 54.32% | 33.73% | 5.51% | 2.46% | 0.93% | 1.27% | 1.27% | 0.51% | 1,180 |
| trpc | 59.20% | 35.90% | 3.21% | 0.80% | 0.24% | 0.48% | 0.16% | 0.00% | 1,245 |
| vite | 50.26% | 36.34% | 6.64% | 2.57% | 1.28% | 1.24% | 1.03% | 0.64% | 2,336 |
| astro | 54.86% | 33.48% | 6.40% | 2.42% | 1.22% | 0.85% | 0.50% | 0.27% | 4,014 |
| excalidraw | 54.44% | 35.06% | 5.21% | 2.00% | 1.00% | 1.04% | 0.61% | 0.65% | 5,408 |
| next.js | 51.67% | 35.62% | 5.78% | 2.54% | 1.46% | 1.48% | 0.78% | 0.68% | 10,136 |
| vscode | 57.18% | 31.96% | 4.97% | 2.33% | 0.97% | 1.07% | 1.00% | 0.52% | 4,208 |
| ultracite | 53.23% | 35.67% | 8.01% | 1.97% | 0.56% | 0.42% | 0.00% | 0.14% | 712 |
| **8 external, pooled** | 55.16% | 33.53% | 5.37% | 2.22% | 1.12% | 1.31% | 0.74% | 0.54% | 30,904 |
| all 9, pooled | 55.12% | 33.58% | 5.43% | 2.22% | 1.10% | 1.29% | 0.73% | 0.53% | 31,616 |
| zod without locales | 71.59% | 21.95% | 3.18% | 1.33% | 0.38% | 0.71% | 0.57% | 0.29% | 2,105 |

Counts (8 external, pooled):

| Bucket | 0 | 1-5 | 6-10 | 11-15 | 16-20 | 21-30 | 31-50 | 51+ |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Functions | 17,047 | 10,362 | 1,661 | 687 | 345 | 406 | 230 | 166 |

### Limits: how many functions are over 15, 20 and 25

| Repo | > 15 | > 20 | > 25 | Extra at 15 vs 20 (scores 16–20) | > 15 ÷ > 20 | Files with a fn > 15 / > 20 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| zod | 103 (4.33%) | 94 (3.95%) | 27 (1.14%) | 9 | 1.10× | 74 / 72 |
| hono | 47 (3.98%) | 36 (3.05%) | 28 (2.37%) | 11 | 1.31× | 34 / 29 |
| trpc | 11 (0.88%) | 8 (0.64%) | 2 (0.16%) | 3 | 1.38× | 7 / 6 |
| vite | 98 (4.20%) | 68 (2.91%) | 54 (2.31%) | 30 | 1.44× | 47 / 36 |
| astro | 114 (2.84%) | 65 (1.62%) | 46 (1.15%) | 49 | 1.75× | 82 / 54 |
| excalidraw | 178 (3.29%) | 124 (2.29%) | 91 (1.68%) | 54 | 1.44× | 83 / 68 |
| next.js | 446 (4.40%) | 298 (2.94%) | 204 (2.01%) | 148 | 1.50× | 245 / 180 |
| vscode | 150 (3.56%) | 109 (2.59%) | 83 (1.97%) | 41 | 1.38× | 68 / 58 |
| ultracite | 8 (1.12%) | 4 (0.56%) | 1 (0.14%) | 4 | 2.00× | 4 / 2 |
| **8 external, pooled** | 1,147 (3.71%) | 802 (2.60%) | 535 (1.73%) | 345 | 1.43× | 640 / 503 |
| all 9, pooled | 1,155 (3.65%) | 806 (2.55%) | 536 (1.70%) | 349 | 1.43× | 644 / 505 |
| zod without locales | 41 (1.95%) | 33 (1.57%) | 21 (1.00%) | 8 | 1.24× | 12 / 11 |

Median across the 8 external repos: > 15 = 3.77% (range 0.88%–4.40%), > 20 = 2.75% (range 0.64%–3.95%), > 25 = 1.82% (range 0.16%–2.37%); ratio > 15 ÷ > 20 = 1.41× (range 1.10–1.75).

### Cyclomatic vs cognitive

| Repo | Cyclomatic > 20 | Cyc median | Cyc p95 | Cyc max | Spearman ρ (all) | ρ (cognitive > 0) | Both > 20 | Cognitive > 20 only | Cyclomatic > 20 only |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| zod | 86 (3.62%) | 1 | 12 | 122 | 0.891 | 0.909 | 78 | 16 | 8 |
| hono | 20 (1.69%) | 2 | 11 | 83 | 0.913 | 0.877 | 20 | 16 | 0 |
| trpc | 3 (0.24%) | 2 | 7 | 32 | 0.868 | 0.787 | 2 | 6 | 1 |
| vite | 46 (1.97%) | 2 | 12.3 | 167 | 0.930 | 0.890 | 38 | 30 | 8 |
| astro | 50 (1.25%) | 2 | 11 | 114 | 0.926 | 0.872 | 37 | 28 | 13 |
| excalidraw | 116 (2.14%) | 2 | 12 | 149 | 0.913 | 0.839 | 85 | 39 | 31 |
| next.js | 230 (2.27%) | 2 | 13 | 332 | 0.931 | 0.860 | 184 | 114 | 46 |
| vscode | 50 (1.19%) | 1 | 9 | 52 | 0.953 | 0.887 | 46 | 63 | 4 |
| ultracite | 4 (0.56%) | 2 | 10 | 28 | 0.903 | 0.841 | 2 | 2 | 2 |
| **8 external, pooled** | 601 (1.94%) | 2 | 12 | 332 | 0.926 | 0.862 | 490 | 312 | 111 |
| all 9, pooled | 605 (1.91%) | 2 | 11 | 332 | 0.925 | 0.861 | 492 | 314 | 113 |

Pooled Pearson r (8 external) = 0.891; Spearman on top-level functions only = 0.927 (n = 17,929).

Most extreme disagreements (all 9 repos):

Largest cyclomatic − cognitive:

| Function | Repo | Cognitive | Cyclomatic | Lines |
| --- | ---: | ---: | ---: | ---: |
| [`handler`](https://github.com/vercel/next.js/blob/d8bfc3c994670c367e6e31853b78f42e8b7fba85/packages/next/src/build/templates/app-page-runtime.ts#L215-L2453) | next.js | 90 | 149 | 2239 |
| [`createManifest`](https://github.com/withastro/astro/blob/9050e3819c51b0383cced278c278bc6f45c63468/packages/astro/src/container/index.ts#L132-L195) | astro | 1 | 57 | 64 |
| [`resolveConfig`](https://github.com/vitejs/vite/blob/3b72997d42e7dd2b31898d0e68461e3025e836b6/packages/vite/src/node/config.ts#L1455-L2314) | vite | 113 | 167 | 860 |
| [`areEqual`](https://github.com/excalidraw/excalidraw/blob/4c00f31ddcc20086bac1020428819fe0b9a30bce/packages/excalidraw/index.tsx#L269-L399) | excalidraw | 12 | 66 | 131 |
| [`App.render`](https://github.com/excalidraw/excalidraw/blob/4c00f31ddcc20086bac1020428819fe0b9a30bce/packages/excalidraw/components/App.tsx#L2326-L2752) | excalidraw | 14 | 64 | 427 |
| [`getDefineEnv`](https://github.com/vercel/next.js/blob/d8bfc3c994670c367e6e31853b78f42e8b7fba85/packages/next/src/build/define-env.ts#L106-L464) | next.js | 63 | 109 | 359 |
| [`generateCheck`](https://github.com/colinhacks/zod/blob/284243fb0d6532665afdc9239188773bb624f73c/packages/zod/src/v4/core/compile.ts#L958-L1108) | zod | 3 | 43 | 151 |
| [`mergeMetadata`](https://github.com/vercel/next.js/blob/d8bfc3c994670c367e6e31853b78f42e8b7fba85/packages/next/src/lib/metadata/metadata-resolution-primitives.ts#L215-L452) | next.js | 22 | 59 | 238 |

Largest cognitive − cyclomatic:

| Function | Repo | Cognitive | Cyclomatic | Lines |
| --- | ---: | ---: | ---: | ---: |
| [`createMetadataElements`](https://github.com/vercel/next.js/blob/d8bfc3c994670c367e6e31853b78f42e8b7fba85/packages/next/src/lib/metadata/metadata-elements.tsx#L83-L1633) | next.js | 989 | 318 | 1551 |
| [`handleBuildComplete`](https://github.com/vercel/next.js/blob/d8bfc3c994670c367e6e31853b78f42e8b7fba85/packages/next/src/build/adapter/build-complete.ts#L601-L2555) | next.js | 612 | 243 | 1955 |
| [`cache`](https://github.com/vercel/next.js/blob/d8bfc3c994670c367e6e31853b78f42e8b7fba85/packages/next/src/server/use-cache/use-cache-wrapper.ts#L1867-L3853) | next.js | 574 | 332 | 1987 |
| [`generateBundle`](https://github.com/withastro/astro/blob/9050e3819c51b0383cced278c278bc6f45c63468/packages/astro/src/core/build/plugins/plugin-css.ts#L70-L400) | astro | 323 | 114 | 331 |
| [`handleRoute`](https://github.com/vercel/next.js/blob/d8bfc3c994670c367e6e31853b78f42e8b7fba85/packages/next/src/server/lib/router-utils/resolve-routes.ts#L362-L948) | next.js | 342 | 133 | 587 |
| [`getBaseWebpackConfig`](https://github.com/vercel/next.js/blob/d8bfc3c994670c367e6e31853b78f42e8b7fba85/packages/next/src/build/webpack-config.ts#L327-L2888) | next.js | 454 | 301 | 2562 |
| [`build`](https://github.com/honojs/hono/blob/f78a245abc393368583085e19c7f5b28b460bf51/src/jsx/dom/render.ts#L512-L719) | hono | 228 | 83 | 208 |
| [`<callback to compilation.hooks.optimizeChunks.tap>`](https://github.com/vercel/next.js/blob/d8bfc3c994670c367e6e31853b78f42e8b7fba85/packages/next/src/build/webpack/plugins/css-chunking-plugin.ts#L41-L326) | next.js | 199 | 61 | 286 |

Highest cyclomatic ÷ cognitive among functions with cyclomatic > 20:

| Function | Repo | Cognitive | Cyclomatic | Lines |
| --- | ---: | ---: | ---: | ---: |
| [`createManifest`](https://github.com/withastro/astro/blob/9050e3819c51b0383cced278c278bc6f45c63468/packages/astro/src/container/index.ts#L132-L195) | astro | 1 | 57 | 64 |
| [`toLabel`](https://github.com/microsoft/vscode/blob/959031245ebb1fe077e0d512e1397c0ae82006e4/src/vs/editor/common/languages.ts#L436-L469) | vscode | 1 | 30 | 34 |
| [`RenderLineInput.equals`](https://github.com/microsoft/vscode/blob/959031245ebb1fe077e0d512e1397c0ae82006e4/src/vs/editor/common/viewLayout/viewLineRenderer.ts#L182-L208) | vscode | 1 | 23 | 27 |
| [`SelectedShapeActions`](https://github.com/excalidraw/excalidraw/blob/4c00f31ddcc20086bac1020428819fe0b9a30bce/packages/excalidraw/components/Actions.tsx#L129-L217) | excalidraw | 1 | 22 | 89 |
| [`_newElementBase`](https://github.com/excalidraw/excalidraw/blob/4c00f31ddcc20086bac1020428819fe0b9a30bce/packages/element/src/newElement.ts#L87-L172) | excalidraw | 2 | 31 | 86 |
| [`generateCheck`](https://github.com/colinhacks/zod/blob/284243fb0d6532665afdc9239188773bb624f73c/packages/zod/src/v4/core/compile.ts#L958-L1108) | zod | 3 | 43 | 151 |
| [`parse`](https://github.com/microsoft/vscode/blob/959031245ebb1fe077e0d512e1397c0ae82006e4/src/vs/editor/common/cursor/cursorMoveCommands.ts#L828-L912) | vscode | 3 | 23 | 85 |
| [`createViteBuildConfig`](https://github.com/withastro/astro/blob/9050e3819c51b0383cced278c278bc6f45c63468/packages/astro/src/core/build/vite-build-config.ts#L49-L233) | astro | 5 | 38 | 185 |

Highest cognitive ÷ cyclomatic among functions with cognitive > 20:

| Function | Repo | Cognitive | Cyclomatic | Lines |
| --- | ---: | ---: | ---: | ---: |
| [`callback`](https://github.com/vercel/next.js/blob/d8bfc3c994670c367e6e31853b78f42e8b7fba85/packages/next/src/client/app-link-gc.ts#L4-L64) | next.js | 87 | 18 | 61 |
| [`generateBundle`](https://github.com/vitejs/vite/blob/3b72997d42e7dd2b31898d0e68461e3025e836b6/packages/vite/src/node/plugins/importAnalysisBuild.ts#L333-L687) | vite | 192 | 56 | 355 |
| [`computePreferredLocaleList`](https://github.com/withastro/astro/blob/9050e3819c51b0383cced278c278bc6f45c63468/packages/astro/src/i18n/utils.ts#L117-L146) | astro | 37 | 11 | 30 |
| [`<callback to compilation.hooks.optimizeChunks.tap>`](https://github.com/vercel/next.js/blob/d8bfc3c994670c367e6e31853b78f42e8b7fba85/packages/next/src/build/webpack/plugins/css-chunking-plugin.ts#L41-L326) | next.js | 199 | 61 | 286 |
| [`Node.search`](https://github.com/honojs/hono/blob/f78a245abc393368583085e19c7f5b28b460bf51/src/router/trie-router/node.ts#L86-L216) | hono | 101 | 31 | 131 |
| [`TextEdit.compose`](https://github.com/microsoft/vscode/blob/959031245ebb1fe077e0d512e1397c0ae82006e4/src/vs/editor/common/core/edits/textEdit.ts#L217-L580) | vscode | 133 | 41 | 364 |
| [`computePreferredLocale`](https://github.com/withastro/astro/blob/9050e3819c51b0383cced278c278bc6f45c63468/packages/astro/src/i18n/utils.ts#L88-L115) | astro | 29 | 9 | 28 |
| [`contentAssetsBuildPostHook`](https://github.com/withastro/astro/blob/9050e3819c51b0383cced278c278bc6f45c63468/packages/astro/src/content/vite-plugin-content-assets.ts#L254-L321) | astro | 35 | 11 | 68 |

### Top 15 functions by cognitive complexity (all 9 repos)

| # | Function | Repo | Cognitive | Cyclomatic | Lines |
| --- | ---: | ---: | ---: | ---: | ---: |
| 1 | [`createMetadataElements`](https://github.com/vercel/next.js/blob/d8bfc3c994670c367e6e31853b78f42e8b7fba85/packages/next/src/lib/metadata/metadata-elements.tsx#L83-L1633) | next.js | 989 | 318 | 1551 |
| 2 | [`handleBuildComplete`](https://github.com/vercel/next.js/blob/d8bfc3c994670c367e6e31853b78f42e8b7fba85/packages/next/src/build/adapter/build-complete.ts#L601-L2555) | next.js | 612 | 243 | 1955 |
| 3 | [`cache`](https://github.com/vercel/next.js/blob/d8bfc3c994670c367e6e31853b78f42e8b7fba85/packages/next/src/server/use-cache/use-cache-wrapper.ts#L1867-L3853) | next.js | 574 | 332 | 1987 |
| 4 | [`getBaseWebpackConfig`](https://github.com/vercel/next.js/blob/d8bfc3c994670c367e6e31853b78f42e8b7fba85/packages/next/src/build/webpack-config.ts#L327-L2888) | next.js | 454 | 301 | 2562 |
| 5 | [`handleRoute`](https://github.com/vercel/next.js/blob/d8bfc3c994670c367e6e31853b78f42e8b7fba85/packages/next/src/server/lib/router-utils/resolve-routes.ts#L362-L948) | next.js | 342 | 133 | 587 |
| 6 | [`generateBundle`](https://github.com/withastro/astro/blob/9050e3819c51b0383cced278c278bc6f45c63468/packages/astro/src/core/build/plugins/plugin-css.ts#L70-L400) | astro | 323 | 114 | 331 |
| 7 | [`assignDefaultsAndValidate`](https://github.com/vercel/next.js/blob/d8bfc3c994670c367e6e31853b78f42e8b7fba85/packages/next/src/server/config.ts#L353-L1804) | next.js | 320 | 266 | 1452 |
| 8 | [`<callback to getTracer().trace>`](https://github.com/vercel/next.js/blob/d8bfc3c994670c367e6e31853b78f42e8b7fba85/packages/next/src/server/lib/patch-fetch.ts#L401-L1357) | next.js | 242 | 234 | 957 |
| 9 | [`Router.change`](https://github.com/vercel/next.js/blob/d8bfc3c994670c367e6e31853b78f42e8b7fba85/packages/next/src/shared/lib/router/router.ts#L1256-L1994) | next.js | 234 | 172 | 739 |
| 10 | [`build`](https://github.com/honojs/hono/blob/f78a245abc393368583085e19c7f5b28b460bf51/src/jsx/dom/render.ts#L512-L719) | hono | 228 | 83 | 208 |
| 11 | [`renderToHTMLImpl`](https://github.com/vercel/next.js/blob/d8bfc3c994670c367e6e31853b78f42e8b7fba85/packages/next/src/server/render.tsx#L457-L1610) | next.js | 210 | 175 | 1154 |
| 12 | [`Server.handleRequestImpl`](https://github.com/vercel/next.js/blob/d8bfc3c994670c367e6e31853b78f42e8b7fba85/packages/next/src/server/base-server.ts#L994-L1714) | next.js | 209 | 149 | 721 |
| 13 | [`<callback to wp.on>`](https://github.com/vercel/next.js/blob/d8bfc3c994670c367e6e31853b78f42e8b7fba85/packages/next/src/server/lib/router-utils/setup-dev-bundler.ts#L483-L1491) | next.js | 202 | 140 | 1009 |
| 14 | [`<callback to compilation.hooks.optimizeChunks.tap>`](https://github.com/vercel/next.js/blob/d8bfc3c994670c367e6e31853b78f42e8b7fba85/packages/next/src/build/webpack/plugins/css-chunking-plugin.ts#L41-L326) | next.js | 199 | 61 | 286 |
| 15 | [`prerenderToStream`](https://github.com/vercel/next.js/blob/d8bfc3c994670c367e6e31853b78f42e8b7fba85/packages/next/src/server/app-render/app-render.tsx#L8878-L10854) | next.js | 195 | 119 | 1977 |

### Biome cross-check

| Repo | Functions compared | Visible (either ≥ 2) | Exact match | Biome higher | Biome lower | Clean subset agree | sonarjs > 20 | Biome > 20 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| zod | 2,377 | 531 | 131 (24.67%) | 384 | 16 | 118 / 120 | 94 | 102 |
| hono | 1,180 | 444 | 122 (27.48%) | 311 | 11 | 111 / 112 | 36 | 50 |
| trpc | 1,245 | 429 | 80 (18.65%) | 349 | 0 | 78 / 78 | 8 | 18 |
| vite | 2,336 | 972 | 260 (26.75%) | 703 | 9 | 239 / 239 | 68 | 105 |
| astro | 4,014 | 1,407 | 486 (34.54%) | 904 | 17 | 441 / 443 | 65 | 105 |
| excalidraw | 5,408 | 1,940 | 503 (25.93%) | 1,409 | 28 | 477 / 479 | 124 | 165 |
| next.js | 10,136 | 3,993 | 1,241 (31.08%) | 2,676 | 76 | 1,118 / 1,120 | 298 | 437 |
| vscode | 3,647 | 1,070 | 617 (57.66%) | 397 | 56 | 542 / 542 | 94 | 100 |
| ultracite | 712 | 262 | 109 (41.60%) | 152 | 1 | 106 / 106 | 4 | 5 |
| **all 9** | 31,055 | 11,048 | 3,549 (32.12%) | 7,285 | 214 | 3,230 / 3,239 | 791 | 1,087 |

Disagreements by mechanism (a function can show several; all 9 repos):

| Mechanism | Disagreeing functions that contain it |
| --- | ---: |
| nested function | 4,398 |
| \|\| or ?? | 3,902 |
| nested else/else-if | 977 |
| finally | 141 |
| JSX && | 134 |
| function as ternary branch (sonarjs leak) | 45 |
| accessor | 24 |
| none of the above (unexplained) | 9 |

Total disagreements: 7,499.

Same nominal limit, different counts (8 external repos, functions in files Biome could parse; n = 30,343):

| Limit | sonarjs flags (score > limit) | Biome flags (score > limit) | Biome ÷ sonarjs |
| --- | ---: | ---: | ---: |
| 15 | 1,131 | 1,555 | 1.37× |
| 16 | 1,052 | 1,428 | 1.36× |
| 18 | 893 | 1,249 | 1.40× |
| 20 | 787 | 1,082 | 1.37× |
| 22 | 668 | 940 | 1.41× |
| 25 | 523 | 786 | 1.50× |
| 30 | 388 | 597 | 1.54× |

Biome at 20 flags about as many functions as sonarjs at 16; sonarjs at 20 flags about as many as Biome at 25. Spearman ρ between the two scores = 0.901 (Biome's hidden 0/1 coded as 1).

### Examples

| Example | Function | Repo | Cognitive (sonarjs) | Cyclomatic | Biome | Lines | File |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 5a: high cyclomatic, low cognitive (flat switch) | [`toLabel`](https://github.com/microsoft/vscode/blob/959031245ebb1fe077e0d512e1397c0ae82006e4/src/vs/editor/common/languages.ts#L436-L469) | vscode | 1 | 30 | ≤ 1 | 436–469 | `examples/a-high-cyclomatic-low-cognitive.ts` |
| 5a (alternate): high cyclomatic, low cognitive (one long && chain) | [`RenderLineInput.equals`](https://github.com/microsoft/vscode/blob/959031245ebb1fe077e0d512e1397c0ae82006e4/src/vs/editor/common/viewLayout/viewLineRenderer.ts#L182-L208) | vscode | 1 | 23 | ≤ 1 | 182–208 | `examples/a-alt-and-chain-equals.ts` |
| 5b: high cognitive, modest cyclomatic (deep nesting) | [`callback`](https://github.com/vercel/next.js/blob/d8bfc3c994670c367e6e31853b78f42e8b7fba85/packages/next/src/client/app-link-gc.ts#L4-L64) | next.js | 87 | 18 | 114 | 4–64 | `examples/b-high-cognitive-low-cyclomatic.ts` |
| 5b (alternate): high cognitive, modest cyclomatic (nested loops), compact | [`computePreferredLocaleList`](https://github.com/withastro/astro/blob/9050e3819c51b0383cced278c278bc6f45c63468/packages/astro/src/i18n/utils.ts#L117-L146) | astro | 37 | 11 | 38 | 117–146 | `examples/b-alt-nested-loops.ts` |
| 5c: 21-30 cognitive, self-contained, readable, pure | [`formatTimespan`](https://github.com/vercel/next.js/blob/d8bfc3c994670c367e6e31853b78f42e8b7fba85/packages/next/src/server/lib/router-utils/cache-life-type-utils.ts#L12-L49) | next.js | 23 | 13 | 23 | 12–49 | `examples/c-pure-21-30.ts` |
| 5c (alternate): 21-30 cognitive, pure, no dependencies (tokenizer loop) | [`splitRule`](https://github.com/honojs/hono/blob/f78a245abc393368583085e19c7f5b28b460bf51/src/jsx/dom/css.ts#L27-L66) | hono | 21 | 10 | 22 | 27–66 | `examples/c-alt-splitrule.ts` |
| 5c (alternate): 21-30 cognitive, pure, nested if/else decision tree | [`toRoutingStrategy`](https://github.com/withastro/astro/blob/9050e3819c51b0383cced278c278bc6f45c63468/packages/astro/src/core/app/common.ts#L12-L45) | astro | 24 | 10 | 20 | 12–45 | `examples/c-alt-routing-strategy.ts` |
| 5d: the single highest-scoring function across all repos | [`createMetadataElements`](https://github.com/vercel/next.js/blob/d8bfc3c994670c367e6e31853b78f42e8b7fba85/packages/next/src/lib/metadata/metadata-elements.tsx#L83-L1633) | next.js | 989 | 318 | 255 | 83–1633 | `examples/d-highest-scoring.tsx` |

### Exclusions per repo (file counts)

| Repo | Included files | Excluded (by reason) |
| --- | ---: | ---: |
| zod | 125 | dir "benchmarks/": 9; dir "tests/": 198 |
| hono | 187 | test file (*.test.* / *.spec.*): 124; declaration file (*.d.ts): 1; third-party license header: 1 |
| trpc | 176 | dir "__tests__/": 7; test file (*.test.* / *.spec.*): 29; dir "vendor/": 7 |
| vite | 124 | dir "__tests_dts__/": 7; dir "__tests__/": 278; third-party license header: 3; repo-specific exclusion: 8 |
| astro | 635 | repo-specific exclusion: 3; dir "vendor/": 26; third-party license header: 3 |
| excalidraw | 444 | test file (*.test.* / *.spec.*): 30; declaration file (*.d.ts): 5; repo-specific exclusion: 9; dir "tests/": 76; dir "__tests__/": 3; test utility file: 1 |
| next.js | 1,416 | test file (*.test.* / *.spec.*): 154; third-party license header: 21; declaration file (*.d.ts): 12; repo-specific exclusion: 27; dir "__mocks__/": 4; dir "polyfills/": 10; dir "bundles/": 62; dir "compiled/": 706; storybook story: 23; dir "vendored/": 36 |
| vscode | 226 | repo-specific exclusion: 1 |
| ultracite | 50 | none |
