/*
 * Source:    vercel/next.js — packages/next/src/server/revalidation-utils.ts, L5-229 (the whole file
 *            but its imports)
 * Commit:    d8bfc3c994670c367e6e31853b78f42e8b7fba85 (2026-10-09T18:41:23-07:00)
 * Permalink: https://github.com/vercel/next.js/blob/d8bfc3c994670c367e6e31853b78f42e8b7fba85/packages/next/src/server/revalidation-utils.ts#L88-L192
 * Function:  revalidateTags(tagsWithProfile, incrementalCache, workStore), which Next.js runs after a
 *   request to send the tags revalidated during it to the cache handlers. executeRevalidates() (the
 *   file's exported entry point) calls it.
 * L5-229 are copied, with their formatting changed. The stubs above them replace its imports (L1-3).
 * Anything marked STUB is not part of the original source.
 *
 * License of the source repository (vercel/next.js/license.md), reproduced in full:
 *
 * The MIT License (MIT)
 *
 * Copyright (c) 2025 Vercel, Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

// STUB (not part of the original source): what L1-3 import. WorkStore and IncrementalCache
// are reduced to the fields this file uses, with the types they have at the same commit
// (app-render/work-async-storage.external.ts, lib/incremental-cache/index.ts,
// lib/cache-handlers/types.ts). getCacheHandlers returns the handlers the caller put on
// globalThis.__cacheHandlers, as the real one returns the handlers set up at startup.
interface CacheHandler {
  updateTags(tags: string[], durations?: { expire?: number }): Promise<void>;
}
interface IncrementalCache {
  revalidateTag(
    tags: string | string[],
    durations?: { expire?: number }
  ): Promise<void>;
}
interface WorkStore {
  readonly incrementalCache?: IncrementalCache;
  readonly cacheLifeProfiles: Record<
    string,
    { stale?: number; revalidate?: number; expire?: number }
  >;
  pendingRevalidates?: Record<string, Promise<any>>;
  pendingRevalidateWrites?: Promise<void>[];
  pendingRevalidatedTags?: {
    tag: string;
    profile?: string | { stale?: number; revalidate?: number; expire?: number };
    revalidatedAt: number;
  }[];
}
function getCacheHandlers(): CacheHandler[] | undefined {
  return (globalThis as { __cacheHandlers?: CacheHandler[] }).__cacheHandlers;
}
// ── end of STUB ────────────────────────────────────────────────────────

type RevalidationState = Required<
  Pick<
    WorkStore,
    "pendingRevalidatedTags" | "pendingRevalidates" | "pendingRevalidateWrites"
  >
>;

function cloneRevalidationState(store: WorkStore): RevalidationState {
  return {
    // revalidateTag updates revalidatedAt in place when the tag/profile already
    // exists, so snapshot the items as well as the array.
    pendingRevalidatedTags: store.pendingRevalidatedTags
      ? store.pendingRevalidatedTags.map((item) => ({ ...item }))
      : [],
    pendingRevalidates: { ...store.pendingRevalidates },
    pendingRevalidateWrites: store.pendingRevalidateWrites
      ? [...store.pendingRevalidateWrites]
      : [],
  };
}

function diffRevalidationState(
  prev: RevalidationState,
  curr: RevalidationState
): RevalidationState {
  const prevTagsWithProfile = new Map(
    prev.pendingRevalidatedTags.map((item) => {
      const profileKey =
        typeof item.profile === "object"
          ? JSON.stringify(item.profile)
          : item.profile || "";
      return [`${item.tag}:${profileKey}`, item.revalidatedAt] as const;
    })
  );
  const prevRevalidateWrites = new Set(prev.pendingRevalidateWrites);
  return {
    pendingRevalidateWrites: curr.pendingRevalidateWrites.filter(
      (promise) => !prevRevalidateWrites.has(promise)
    ),
    pendingRevalidatedTags: curr.pendingRevalidatedTags.filter((item) => {
      const profileKey =
        typeof item.profile === "object"
          ? JSON.stringify(item.profile)
          : item.profile || "";
      const previousRevalidatedAt = prevTagsWithProfile.get(
        `${item.tag}:${profileKey}`
      );
      return (
        previousRevalidatedAt === undefined ||
        item.revalidatedAt > previousRevalidatedAt
      );
    }),
    pendingRevalidates: Object.fromEntries(
      Object.entries(curr.pendingRevalidates).filter(
        ([key]) => !(key in prev.pendingRevalidates)
      )
    ),
  };
}

interface TagWithProfile {
  tag: string;
  profile?: string | { expire?: number };
}

function groupTagsByProfile(tagsWithProfile: TagWithProfile[]) {
  // Group tags by profile for batch processing
  const tagsByProfile = new Map<
    | string
    | { stale?: number; revalidate?: number; expire?: number }
    | undefined,
    string[]
  >();

  for (const item of tagsWithProfile) {
    const { profile } = item;
    // Find existing profile by comparing values
    let existingKey;
    for (const [key] of tagsByProfile) {
      if (
        typeof key === "string" &&
        typeof profile === "string" &&
        key === profile
      ) {
        existingKey = key;
        break;
      }
      if (
        typeof key === "object" &&
        typeof profile === "object" &&
        JSON.stringify(key) === JSON.stringify(profile)
      ) {
        existingKey = key;
        break;
      }
      if (key === profile) {
        existingKey = key;
        break;
      }
    }

    const profileKey = existingKey || profile;
    if (!tagsByProfile.has(profileKey)) {
      tagsByProfile.set(profileKey, []);
    }
    tagsByProfile.get(profileKey)!.push(item.tag);
  }

  return tagsByProfile;
}

function getRevalidationDurations(
  profile: TagWithProfile["profile"],
  workStore?: WorkStore
) {
  // Look up the cache profile from workStore if available
  let durations: { expire?: number } | undefined;

  if (profile) {
    let cacheLife:
      | { stale?: number; revalidate?: number; expire?: number }
      | undefined;

    if (typeof profile === "object") {
      // Profile is already a cacheLife configuration object
      cacheLife = profile;
    } else if (typeof profile === "string") {
      // Profile is a string key, look it up in workStore
      cacheLife = workStore?.cacheLifeProfiles[profile];

      if (!cacheLife) {
        throw new Error(
          `Invalid profile provided "${profile}" must be configured under cacheLife in next.config or be "max"`
        );
      }
    }

    if (cacheLife) {
      durations = {
        expire: cacheLife.expire,
      };
    }
  }
  // If profile is not found and not 'max', durations will be undefined
  // which will trigger immediate expiration in the cache handler
  return durations;
}

const revalidateTags = async function revalidateTags(
  tagsWithProfile: TagWithProfile[],
  incrementalCache: IncrementalCache | undefined,
  workStore?: WorkStore
): Promise<void> {
  if (tagsWithProfile.length === 0) {
    return;
  }

  const handlers = getCacheHandlers() ?? [];
  const promises: Promise<void>[] = [];
  const tagsByProfile = groupTagsByProfile(tagsWithProfile);

  // Process each profile group
  for (const [profile, tagsForProfile] of tagsByProfile) {
    const durations = getRevalidationDurations(profile, workStore);

    for (const handler of handlers) {
      if (profile) {
        promises.push(handler.updateTags?.(tagsForProfile, durations));
      } else {
        promises.push(handler.updateTags?.(tagsForProfile));
      }
    }

    if (incrementalCache) {
      promises.push(incrementalCache.revalidateTag(tagsForProfile, durations));
    }
  }

  await Promise.all(promises);
};

export const executeRevalidates = function executeRevalidates(
  workStore: WorkStore,
  state?: RevalidationState
): false | Promise<void> {
  const promises: Promise<unknown>[] = [];

  const pendingRevalidatedTags =
    state?.pendingRevalidatedTags ?? workStore.pendingRevalidatedTags ?? [];

  if (pendingRevalidatedTags.length > 0) {
    promises.push(
      revalidateTags(
        pendingRevalidatedTags,
        workStore.incrementalCache,
        workStore
      )
    );
  }

  const pendingRevalidates = Object.values(
    state?.pendingRevalidates ?? workStore.pendingRevalidates ?? {}
  );

  promises.push(...pendingRevalidates);

  const pendingRevalidateWrites =
    state?.pendingRevalidateWrites ?? workStore.pendingRevalidateWrites ?? [];

  promises.push(...pendingRevalidateWrites);

  if (promises.length === 0) {
    return false;
  }

  return Promise.all(promises).then(() => {});
};

/** Run a callback, and execute any *new* revalidations added during its runtime. */
export async function withExecuteRevalidates<T>(
  store: WorkStore | undefined,
  callback: () => Promise<T>
): Promise<T> {
  if (!store) {
    return callback();
  }
  // If we executed any revalidates during the request, then we don't want to execute them again.
  // save the state so we can check if anything changed after we're done running callbacks.
  const savedRevalidationState = cloneRevalidationState(store);
  try {
    return await callback();
  } finally {
    // Check if we have any new revalidates, and if so, wait until they are all resolved.
    const newRevalidates = diffRevalidationState(
      savedRevalidationState,
      cloneRevalidationState(store)
    );
    await executeRevalidates(store, newRevalidates);
  }
}
