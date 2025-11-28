import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
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
    [locale: string]: {
      hash: string;
      translatedAt: string;
    };
  };
};

async function loadCache(): Promise<TranslationCache> {
  if (!existsSync(HASH_CACHE_FILE)) {
    return {};
  }

  try {
    const content = await readFile(HASH_CACHE_FILE, "utf-8");
    return JSON.parse(content);
  } catch (error) {
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
  if (!fileCache) return true;

  const localeCache = fileCache[locale];
  if (!localeCache) return true;

  return localeCache.hash !== currentHash;
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

  if (!cache[filePath]) {
    cache[filePath] = {};
  }
  cache[filePath][targetLocale] = {
    hash: contentHash,
    translatedAt: new Date().toISOString(),
  };

  console.log(`✓ Translated: ${filePath} → ${newFilePath}`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const targetLocalesArg = args.find((arg) => arg.startsWith("--locales="));
  const forceRetranslate = args.includes("--force");
  const targetLocales = targetLocalesArg
    ? targetLocalesArg.split("=")[1].split(",")
    : null;

  const allLocales = i18n.languages.filter((lang) => lang !== DEFAULT_LOCALE);
  const locales = targetLocales
    ? allLocales.filter((lang) => targetLocales.includes(lang))
    : allLocales;

  if (locales.length === 0) {
    throw new Error("No valid locales specified");
  }

  console.log("Loading translation cache...");
  const cache = await loadCache();

  console.log(`Finding all MDX files in ${CONTENT_DIR}...`);
  const mdxFiles = await getAllMdxFiles(CONTENT_DIR);

  const fileHashes = new Map<string, string>();
  for (const filePath of mdxFiles) {
    const content = await readFile(filePath, "utf-8");
    fileHashes.set(filePath, computeHash(content));
  }

  console.log(`Found ${mdxFiles.length} files to translate`);
  console.log(`Target locales: ${locales.join(", ")}`);

  let skipped = 0;
  let completed = 0;
  let failed = 0;

  const filesToTranslate: Array<{
    filePath: string;
    locale: string;
    hash: string;
  }> = [];

  for (const locale of locales) {
    for (const filePath of mdxFiles) {
      const hash = fileHashes.get(filePath)!;
      if (forceRetranslate || needsTranslation(cache, filePath, locale, hash)) {
        filesToTranslate.push({ filePath, locale, hash });
      } else {
        skipped += 1;
      }
    }
  }

  const total = filesToTranslate.length;
  console.log(`Translations needed: ${total}`);
  if (skipped > 0) {
    console.log(`Skipped (unchanged): ${skipped}`);
  }
  console.log();

  const BATCH_SIZE = 10;

  const localeGroups = new Map<string, typeof filesToTranslate>();
  for (const item of filesToTranslate) {
    if (!localeGroups.has(item.locale)) {
      localeGroups.set(item.locale, []);
    }
    localeGroups.get(item.locale)!.push(item);
  }

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

      const promises = batch.map(async ({ filePath, locale, hash }) => {
        try {
          await translateFile(filePath, locale, cache, hash);
          completed += 1;
          console.log(
            `✓ ${filePath} → Progress: ${completed}/${total} (${Math.round((completed / total) * 100)}%)`
          );
        } catch (error) {
          failed += 1;
          console.error(`✗ Failed to translate ${filePath} to ${locale}:`);
          console.error(error instanceof Error ? error.message : error);
        }
      });

      await Promise.all(promises);
      await saveCache(cache);
    }
  }

  await saveCache(cache);

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
  console.log(`\n✓ Translation process complete! Cache saved to ${HASH_CACHE_FILE}`);
}

main().catch((error) => {
  console.error("Translation failed:", error);
  process.exit(1);
});
