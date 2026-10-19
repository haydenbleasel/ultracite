#!/usr/bin/env bash
# History clones for the TODO-comments topic (age and survival of TODOs, todo-history.cjs).
#
# Bare clones under repos/history/ (gitignored, next to the depth-1 corpus clones, which are left
# alone). Nothing is checked out, installed, built or executed: todo-history.cjs only runs
# `git log`, `git blame` and `git show` on them.
#
# - The six smaller repos get their whole default-branch history, without blobs over 1 MB
#   (fonts, images), which a diff fetches lazily if it ever needs one.
# - next.js and vscode are 2.6 GB and 1.6 GB on GitHub, so they get commits and trees only
#   (--filter=blob:none), then `git backfill --sparse` downloads, in a few batches, the blobs of
#   every historical version of the measured source directories only: vscode's
#   src/vs/editor/common, and Next.js's packages/next source directories in both layouts (before
#   and after the 2022 move to packages/next/src), without compiled/ and bundles/. Backfill needs
#   cone-mode patterns, which this script writes into the bare repo's info/sparse-checkout.
#
# Each pinned SHA from repos.json must be in the fetched history; the script checks.
#
# Usage: bash research/corpus/scripts/todo-history-clone.sh [name ...]   (default: all eight)
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p repos/history

clone() { # <name> <github slug> <branch> <pinned sha> <filter>
  local dir="repos/history/$1.git"
  if [ ! -d "$dir" ]; then
    git clone -q --bare --single-branch --branch "$3" --filter="$5" "https://github.com/$2" "$dir"
  fi
  if ! git -C "$dir" cat-file -e "$4^{commit}" 2>/dev/null; then
    echo "$1: pinned $4 is not in the fetched history" >&2
    exit 1
  fi
  echo "$dir  $(git -C "$dir" rev-list --count "$4") commits up to the pinned SHA  ($(du -sh "$dir" | cut -f1))"
}

want() { [ "$#" -eq 0 ] || [[ " ${NAMES[*]} " == *" $1 "* ]]; }
NAMES=("$@")

want zod        && clone zod        colinhacks/zod        main   284243fb0d6532665afdc9239188773bb624f73c blob:limit=1m
want hono       && clone hono       honojs/hono           main   f78a245abc393368583085e19c7f5b28b460bf51 blob:limit=1m
want trpc       && clone trpc       trpc/trpc             main   796700d8653b3832409fff997e6f5789519b9ea7 blob:limit=1m
want vite       && clone vite       vitejs/vite           main   3b72997d42e7dd2b31898d0e68461e3025e836b6 blob:limit=1m
want astro      && clone astro      withastro/astro       main   9050e3819c51b0383cced278c278bc6f45c63468 blob:limit=1m
want excalidraw && clone excalidraw excalidraw/excalidraw master 4c00f31ddcc20086bac1020428819fe0b9a30bce blob:limit=1m
want next.js    && clone next.js    vercel/next.js        canary d8bfc3c994670c367e6e31853b78f42e8b7fba85 blob:none
want vscode     && clone vscode     microsoft/vscode      main   959031245ebb1fe077e0d512e1397c0ae82006e4 blob:none

backfill() { # <name> <cone directory>...
  local dir="repos/history/$1.git"
  shift
  git -C "$dir" config core.sparseCheckout true
  git -C "$dir" config core.sparseCheckoutCone true
  mkdir -p "$dir/info"
  # Cone format: every parent directory's own files, plus each listed directory recursively.
  {
    printf '/*\n!/*/\n'
    local seen=""
    for path in "$@"; do
      local parent=""
      IFS=/ read -ra parts <<< "$path"
      for ((i = 0; i < ${#parts[@]} - 1; i++)); do
        parent="$parent/${parts[$i]}"
        case " $seen " in *" $parent "*) ;; *) printf '%s/\n!%s/*/\n' "$parent" "$parent"; seen="$seen $parent" ;; esac
      done
      printf '/%s/\n' "$path"
    done
  } > "$dir/info/sparse-checkout"
  git -C "$dir" backfill --sparse --min-batch-size=5000
  echo "$dir backfilled ($(du -sh "$dir" | cut -f1))"
}

if want vscode; then
  backfill vscode src/vs/editor/common
fi
if want next.js; then
  NEXT_DIRS=()
  for d in agent-feedback api bin build cli client diagnostics experimental export lib next-devtools pages server shared telemetry trace; do
    NEXT_DIRS+=("packages/next/src/$d")
  done
  for d in bin build cli client export lib pages server shared telemetry trace next-server types; do
    NEXT_DIRS+=("packages/next/$d")
  done
  backfill next.js "${NEXT_DIRS[@]}"
fi
true
