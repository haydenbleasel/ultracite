import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, parse } from "node:path";
import { generateText } from "ai";
import { i18n } from "../lib/i18n";

const CONTENT_DIR = join(process.cwd(), "content");
const DEFAULT_LOCALE = "en";

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

IMPORTANT INSTRUCTIONS:
- Preserve ALL MDX frontmatter (the content between --- markers at the top)
- Preserve ALL code blocks exactly as they are (do not translate code)
- Preserve ALL MDX components and their syntax (e.g., <Callout>, <Card>, etc.)
- Preserve ALL links and URLs
- Preserve ALL file paths and technical identifiers
- Only translate the natural language text content
- Maintain the same formatting and structure
- Keep the same tone (technical documentation)

Content to translate:

${content}

Translated content:`,
  });

  return text;
}

async function translateFile(
  filePath: string,
  targetLocale: string
): Promise<void> {
  const content = await readFile(filePath, "utf-8");
  const { dir, name, ext } = parse(filePath);

  const translatedContent = await translateContent(content, targetLocale);
  const newFileName = `${name}.${targetLocale}${ext}`;
  const newFilePath = join(dir, newFileName);

  await writeFile(newFilePath, translatedContent, "utf-8");
  console.log(`✓ Translated: ${filePath} → ${newFilePath}`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const targetLocalesArg = args.find((arg) => arg.startsWith("--locales="));
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

  console.log(`Finding all MDX files in ${CONTENT_DIR}...`);
  const mdxFiles = await getAllMdxFiles(CONTENT_DIR);
  console.log(`Found ${mdxFiles.length} files to translate`);
  console.log(`Target locales: ${locales.join(", ")}`);
  console.log(
    `Total translations to generate: ${mdxFiles.length * locales.length}\n`
  );

  let completed = 0;
  let failed = 0;
  const total = mdxFiles.length * locales.length;

  for (const locale of locales) {
    const languageName = LOCALE_NAMES[locale] || locale;
    console.log(`\n${"=".repeat(50)}`);
    console.log(`Translating to ${languageName} (${locale})`);
    console.log("=".repeat(50));

    for (const filePath of mdxFiles) {
      try {
        await translateFile(filePath, locale);
        completed += 1;
        console.log(
          `Progress: ${completed}/${total} (${Math.round((completed / total) * 100)}%)`
        );
      } catch (error) {
        failed += 1;
        console.error(`✗ Failed to translate ${filePath} to ${locale}:`);
        console.error(error instanceof Error ? error.message : error);
      }
    }
  }

  console.log(`\n${"=".repeat(50)}`);
  console.log("Translation Summary");
  console.log("=".repeat(50));
  console.log(`✓ Completed: ${completed}/${total}`);
  if (failed > 0) {
    console.log(`✗ Failed: ${failed}/${total}`);
  }
  console.log("\n✓ Translation process complete!");
}

main().catch((error) => {
  console.error("Translation failed:", error);
  process.exit(1);
});
