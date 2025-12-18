import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, parse } from "node:path";
import { generateText } from "ai";
import { i18n } from "../lib/i18n";

const CONTENT_DIR = join(process.cwd(), "content");
const DEFAULT_LOCALE = "en";
const HASH_CACHE_FILE = join(process.cwd(), ".translation-cache.json");

async function getAllMdxFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      const nestedFiles = await getAllMdxFiles(fullPath);
      files.push(...nestedFiles);
    } else if (entry.isFile() && entry.name.endsWith(".mdx")) {
      const { name } = parse(entry.name);
      if (!name.includes(".")) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

function computeHash(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

type TranslationCache = {
  [filePath: string]: {
    hash: string;
    translations: {
      [locale: string]: {
        translatedAt: string;
      };
    };
  };
};

type OldTranslationCache = {
  [filePath: string]: {
    [locale: string]: {
      hash: string;
      translatedAt: string;
    };
  };
};

function migrateCache(oldCache: OldTranslationCache): TranslationCache {
  const newCache: TranslationCache = {};

  for (const [filePath, locales] of Object.entries(oldCache)) {
    // Check if this is already in the new format
    if ("hash" in locales && "translations" in locales) {
      newCache[filePath] = locales as unknown as TranslationCache[string];
      continue;
    }

    // Migrate from old format - get hash from any locale (they're all the same)
    const localeEntries = Object.entries(locales);
    if (localeEntries.length === 0) {
      continue;
    }

    const firstLocale = localeEntries[0][1];
    const hash = firstLocale.hash;

    newCache[filePath] = {
      hash,
      translations: {},
    };

    for (const [locale, data] of localeEntries) {
      newCache[filePath].translations[locale] = {
        translatedAt: data.translatedAt,
      };
    }
  }

  return newCache;
}

async function loadCache(): Promise<TranslationCache> {
  if (!existsSync(HASH_CACHE_FILE)) {
    return {};
  }

  try {
    const content = await readFile(HASH_CACHE_FILE, "utf-8");
    const parsed = JSON.parse(content);

    // Check if migration is needed (old format has locale objects with hash inside)
    const firstEntry = Object.values(parsed)[0] as Record<string, unknown>;
    if (
      firstEntry &&
      typeof firstEntry === "object" &&
      !("hash" in firstEntry) &&
      !("translations" in firstEntry)
    ) {
      console.log("Migrating translation cache to new format...");
      const migrated = migrateCache(parsed as OldTranslationCache);
      await saveCache(migrated);
      return migrated;
    }

    return parsed;
  } catch (_error) {
    console.warn("Failed to load translation cache, starting fresh");
    return {};
  }
}

async function saveCache(cache: TranslationCache): Promise<void> {
  await writeFile(HASH_CACHE_FILE, JSON.stringify(cache, null, 2), "utf-8");
}

function needsTranslation(
  cache: TranslationCache,
  filePath: string,
  locale: string,
  currentHash: string
): boolean {
  const fileCache = cache[filePath];
  if (!fileCache) {
    return true;
  }

  // If the source file hash changed, all translations need updating
  if (fileCache.hash !== currentHash) {
    return true;
  }

  // Check if this specific locale has been translated
  const localeCache = fileCache.translations?.[locale];
  if (!localeCache) {
    return true;
  }

  return false;
}

const LOCALE_NAMES: Record<string, string> = {
  da: "Danish",
  nl: "Dutch",
  fi: "Finnish",
  fr: "French",
  de: "German",
  hu: "Hungarian",
  id: "Indonesian",
  ga: "Irish",
  it: "Italian",
  no: "Norwegian",
  pt: "Portuguese",
  ro: "Romanian",
  sr: "Serbian",
  sl: "Slovenian",
  es: "Spanish",
  sv: "Swedish",
  tr: "Turkish",
};

async function translateContent(
  content: string,
  targetLocale: string
): Promise<string> {
  const languageName = LOCALE_NAMES[targetLocale] || targetLocale;

  const { text } = await generateText({
    model: "openai/gpt-5-mini",
    prompt: `You are a professional technical translator. Translate the following MDX documentation content to ${languageName} (locale: ${targetLocale}).

CRITICAL INSTRUCTIONS:
1. TRANSLATE ALL natural language text, including:
   - MDX frontmatter: Translate the VALUES of "title" and "description" fields (keep field names in English)
   - Regular text content
   - Text inside bold markers (**text**)
   - Text inside italic markers (*text*)
   - List item labels (including text before colons in lists)
   - Headings and subheadings
   - Link text (but NOT the URL itself)

2. DO NOT TRANSLATE:
   - Code blocks and inline code (\`code\`)
   - URLs and file paths
   - Technical identifiers, package names, command names
   - Frontmatter field names (title:, description:, etc.)
   - MDX component syntax

3. PRESERVE:
   - All markdown formatting (**, *, -, etc.)
   - All code block syntax and fences
   - All MDX components and their syntax
   - All link structures [text](url)
   - The exact same document structure
   - Frontmatter structure (--- markers and field names)

4. MAINTAIN:
   - Technical documentation tone
   - Professional terminology
   - Same formatting and indentation

EXAMPLES:

Frontmatter:
English:
---
title: Angular
description: Angular-specific configuration for Ultracite.
---

${languageName}:
---
title: [Translate "Angular" if it's descriptive, or keep as-is if it's a proper noun]
description: [Translate "Angular-specific configuration for Ultracite."]
---

List items with labels:
English: - **Updated Biome**: Upgraded from v1.x to v2.x
${languageName}: - **[Translate "Updated Biome"]**: [Translate "Upgraded from v1.x to v2.x"]

Content to translate:

${content}

Translated content:`,
  });

  return text;
}

async function translateFile(
  filePath: string,
  targetLocale: string,
  cache: TranslationCache,
  contentHash: string
): Promise<void> {
  const content = await readFile(filePath, "utf-8");
  const { dir, name, ext } = parse(filePath);

  const translatedContent = await translateContent(content, targetLocale);
  const newFileName = `${name}.${targetLocale}${ext}`;
  const newFilePath = join(dir, newFileName);

  await writeFile(newFilePath, translatedContent, "utf-8");

  if (cache[filePath]) {
    // Update the hash in case it changed
    cache[filePath].hash = contentHash;
  } else {
    cache[filePath] = {
      hash: contentHash,
      translations: {},
    };
  }
  cache[filePath].translations[targetLocale] = {
    translatedAt: new Date().toISOString(),
  };

  console.log(`✓ Translated: ${filePath} → ${newFilePath}`);
}

type TranslationItem = {
  filePath: string;
  locale: string;
  hash: string;
};

function parseArgs(): {
  targetLocales: string[] | null;
  forceRetranslate: boolean;
} {
  const args = process.argv.slice(2);
  const targetLocalesArg = args.find((arg) => arg.startsWith("--locales="));
  const forceRetranslate = args.includes("--force");
  const targetLocales = targetLocalesArg
    ? targetLocalesArg.split("=")[1].split(",")
    : null;
  return { targetLocales, forceRetranslate };
}

function getLocales(targetLocales: string[] | null): string[] {
  const allLocales = i18n.languages.filter((lang) => lang !== DEFAULT_LOCALE);
  return targetLocales
    ? allLocales.filter((lang) => targetLocales.includes(lang))
    : allLocales;
}

async function computeFileHashes(
  mdxFiles: string[]
): Promise<Map<string, string>> {
  const fileHashes = new Map<string, string>();
  for (const filePath of mdxFiles) {
    const content = await readFile(filePath, "utf-8");
    fileHashes.set(filePath, computeHash(content));
  }
  return fileHashes;
}

function collectFilesToTranslate(options: {
  locales: string[];
  mdxFiles: string[];
  fileHashes: Map<string, string>;
  cache: TranslationCache;
  forceRetranslate: boolean;
}): { filesToTranslate: TranslationItem[]; skipped: number } {
  const { locales, mdxFiles, fileHashes, cache, forceRetranslate } = options;
  const filesToTranslate: TranslationItem[] = [];
  let skipped = 0;

  for (const locale of locales) {
    for (const filePath of mdxFiles) {
      const hash = fileHashes.get(filePath);
      if (!hash) {
        continue;
      }
      if (forceRetranslate || needsTranslation(cache, filePath, locale, hash)) {
        filesToTranslate.push({ filePath, locale, hash });
      } else {
        skipped += 1;
      }
    }
  }

  return { filesToTranslate, skipped };
}

function groupByLocale(
  filesToTranslate: TranslationItem[]
): Map<string, TranslationItem[]> {
  const localeGroups = new Map<string, TranslationItem[]>();
  for (const item of filesToTranslate) {
    if (!localeGroups.has(item.locale)) {
      localeGroups.set(item.locale, []);
    }
    localeGroups.get(item.locale)?.push(item);
  }
  return localeGroups;
}

async function processBatch(
  batch: TranslationItem[],
  cache: TranslationCache,
  stats: { completed: number; failed: number },
  total: number
): Promise<void> {
  const promises = batch.map(async ({ filePath, locale: itemLocale, hash }) => {
    try {
      await translateFile(filePath, itemLocale, cache, hash);
      stats.completed += 1;
      console.log(
        `✓ ${filePath} → Progress: ${stats.completed}/${total} (${Math.round((stats.completed / total) * 100)}%)`
      );
    } catch (error) {
      stats.failed += 1;
      console.error(`✗ Failed to translate ${filePath} to ${itemLocale}:`);
      console.error(error instanceof Error ? error.message : error);
    }
  });

  await Promise.all(promises);
  await saveCache(cache);
}

function printSummary(
  completed: number,
  skipped: number,
  failed: number
): void {
  console.log(`\n${"=".repeat(50)}`);
  console.log("Translation Summary");
  console.log("=".repeat(50));
  console.log(`✓ Completed: ${completed}`);
  if (skipped > 0) {
    console.log(`⊘ Skipped (unchanged): ${skipped}`);
  }
  if (failed > 0) {
    console.log(`✗ Failed: ${failed}`);
  }
  console.log(
    `\n✓ Translation process complete! Cache saved to ${HASH_CACHE_FILE}`
  );
}

async function main(): Promise<void> {
  const { targetLocales, forceRetranslate } = parseArgs();
  const locales = getLocales(targetLocales);

  if (locales.length === 0) {
    throw new Error("No valid locales specified");
  }

  console.log("Loading translation cache...");
  const cache = await loadCache();

  console.log(`Finding all MDX files in ${CONTENT_DIR}...`);
  const mdxFiles = await getAllMdxFiles(CONTENT_DIR);
  const fileHashes = await computeFileHashes(mdxFiles);

  console.log(`Found ${mdxFiles.length} files to translate`);
  console.log(`Target locales: ${locales.join(", ")}`);

  const { filesToTranslate, skipped } = collectFilesToTranslate({
    locales,
    mdxFiles,
    fileHashes,
    cache,
    forceRetranslate,
  });

  const total = filesToTranslate.length;
  console.log(`Translations needed: ${total}`);
  if (skipped > 0) {
    console.log(`Skipped (unchanged): ${skipped}`);
  }
  console.log();

  const BATCH_SIZE = 10;
  const localeGroups = groupByLocale(filesToTranslate);
  const stats = { completed: 0, failed: 0 };

  for (const [locale, items] of localeGroups) {
    const languageName = LOCALE_NAMES[locale] || locale;
    console.log(`\n${"=".repeat(50)}`);
    console.log(`Translating to ${languageName} (${locale})`);
    console.log("=".repeat(50));

    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      const batch = items.slice(i, i + BATCH_SIZE);
      console.log(
        `\nProcessing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(items.length / BATCH_SIZE)} (${batch.length} files)...`
      );
      await processBatch(batch, cache, stats, total);
    }
  }

  await saveCache(cache);
  printSummary(stats.completed, skipped, stats.failed);
}

main().catch((error) => {
  console.error("Translation failed:", error);
  process.exit(1);
});
