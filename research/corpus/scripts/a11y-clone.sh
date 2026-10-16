#!/usr/bin/env bash
# Clones the extra React codebases the accessibility post measures (scripts/repos-accessibility.json)
# into repos/ (gitignored), at their pinned commits. Shallow (depth 1), partial and sparse: only the
# measured directories, plus the directories their imports resolve into, are checked out.
# Nothing is installed, built or executed from the clones. The eight repos of repos.json are cloned
# by clone.sh, and their pinned SHAs don't change.
#
# Usage: bash research/corpus/scripts/a11y-clone.sh   (from anywhere; it cd's to research/corpus)
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p repos

fetch_sparse() { # <dir> <github slug> <sha> <sparse dir>...
  local dir="repos/$1" slug="$2" sha="$3"
  shift 3
  if [ -d "$dir/.git" ]; then echo "skip $dir (exists)"; return; fi
  git init -q "$dir"
  git -C "$dir" remote add origin "https://github.com/$slug"
  git -C "$dir" sparse-checkout set "$@"
  git -C "$dir" fetch -q --depth 1 --filter=blob:none origin "$sha"
  git -C "$dir" checkout -q FETCH_HEAD
  echo "$dir @ $(git -C "$dir" rev-parse HEAD)"
}

# shadcn/ui: the new-york-v4 registry (the components and blocks people copy into their apps),
# plus the hooks and lib its imports resolve to.
fetch_sparse shadcn     shadcn-ui/ui         c2477f311c19982ef6e246085438e6cfec3e35ea \
  apps/v4/registry/new-york-v4 apps/v4/hooks apps/v4/lib
# Radix Primitives: every React package.
fetch_sparse radix      radix-ui/primitives  eb3a2b7091293e27df8f9ba906632d8daa3d81a3 \
  packages/react
# React Aria Components (adobe/react-spectrum): the component package.
fetch_sparse react-aria adobe/react-spectrum 8e76acfbc6aef833bfb8495a29dc93b6ac7c7b6c \
  packages/react-aria-components
# Supabase Studio: the dashboard's components, plus the design-system packages they import.
fetch_sparse supabase   supabase/supabase    09f80f528ec47569841408a81668dff90525c48a \
  apps/studio/components apps/studio/pages apps/studio/hooks apps/studio/lib apps/studio/state \
  apps/studio/data apps/studio/types packages/ui packages/ui-patterns packages/icons packages/common \
  packages/eslint-config-supabase
