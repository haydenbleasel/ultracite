#!/usr/bin/env bash
# Recreates repos/ (gitignored) at the exact commits measured in results/<topic>/.
# Shallow (depth 1) fetch of each pinned SHA; next.js and vscode are partial + sparse clones of
# only the measured directories. Nothing is installed, built or executed from the clones.
#
# Usage: bash research/corpus/scripts/clone.sh   (from anywhere; it cd's to research/corpus)
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p repos

fetch_pinned() { # <dir> <github slug> <sha> [sparse dir]
  local dir="repos/$1" slug="$2" sha="$3" sparse="${4:-}"
  if [ -d "$dir/.git" ]; then echo "skip $dir (exists)"; return; fi
  git init -q "$dir"
  git -C "$dir" remote add origin "https://github.com/$slug"
  if [ -n "$sparse" ]; then
    git -C "$dir" sparse-checkout set "$sparse"
    git -C "$dir" fetch -q --depth 1 --filter=blob:none origin "$sha"
  else
    git -C "$dir" fetch -q --depth 1 origin "$sha"
  fi
  git -C "$dir" checkout -q FETCH_HEAD
  echo "$dir @ $(git -C "$dir" rev-parse HEAD)"
}

fetch_pinned zod        colinhacks/zod        284243fb0d6532665afdc9239188773bb624f73c
fetch_pinned hono       honojs/hono           f78a245abc393368583085e19c7f5b28b460bf51
fetch_pinned trpc       trpc/trpc             796700d8653b3832409fff997e6f5789519b9ea7
fetch_pinned vite       vitejs/vite           3b72997d42e7dd2b31898d0e68461e3025e836b6
fetch_pinned astro      withastro/astro       9050e3819c51b0383cced278c278bc6f45c63468
fetch_pinned excalidraw excalidraw/excalidraw 4c00f31ddcc20086bac1020428819fe0b9a30bce
fetch_pinned next.js    vercel/next.js        d8bfc3c994670c367e6e31853b78f42e8b7fba85 packages/next/src
fetch_pinned vscode     microsoft/vscode      959031245ebb1fe077e0d512e1397c0ae82006e4 src/vs/editor/common
