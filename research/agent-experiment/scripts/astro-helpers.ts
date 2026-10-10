/*
 * Runtime implementations of the four helpers that subject s2 (Astro's
 * computePreferredLocaleList) declares as type-only stubs. Copied verbatim from
 * withastro/astro at 9050e3819c51b0383cced278c278bc6f45c63468:
 *   parseLocale, sortAndFilterLocales  packages/astro/src/i18n/utils.ts (lines 18-61, 64-80; `export` added to the latter)
 *   getAllCodes                        packages/astro/src/i18n/index.ts (lines 209-219)
 *   normalizeTheLocale                 packages/astro/src/i18n/path.ts (lines 31-33)
 * MIT License, Copyright (c) 2021 Fred K. Schott (full text in the subject file header).
 *
 * The behavior harness installs these on globalThis before importing the subject, so the
 * subject's `declare function` stubs resolve to the real code at call time.
 */

type Locales = (string | { path: string; codes: string[] })[];

type BrowserLocale = {
  locale: string;
  qualityValue: number | undefined;
};

export function parseLocale(header: string): BrowserLocale[] {
  // Any language, early return
  if (header === "*") {
    return [{ locale: header, qualityValue: undefined }];
  }
  const result: BrowserLocale[] = [];
  // we split by `,` and trim the white spaces
  const localeValues = header.split(",").map((str) => str.trim());

  for (const localeValue of localeValues) {
    // split the locale name from the quality value
    const split = localeValue.split(";").map((str) => str.trim());
    const localeName: string = split[0];
    const qualityValue: string | undefined = split[1];

    if (!split) {
      // invalid value
      continue;
    }

    // we check if the quality value is present, and it is actually `q=`
    if (qualityValue && qualityValue.startsWith("q=")) {
      const qualityValueAsFloat = Number.parseFloat(
        qualityValue.slice("q=".length)
      );
      // The previous operation can return a `NaN`, so we check if it is a safe operation
      if (Number.isNaN(qualityValueAsFloat) || qualityValueAsFloat > 1) {
        result.push({
          locale: localeName,
          qualityValue: undefined,
        });
      } else {
        result.push({
          locale: localeName,
          qualityValue: qualityValueAsFloat,
        });
      }
    } else {
      result.push({
        locale: localeName,
        qualityValue: undefined,
      });
    }
  }

  return result;
}

export function sortAndFilterLocales(
  browserLocaleList: BrowserLocale[],
  locales: Locales
) {
  const normalizedLocales = getAllCodes(locales).map(normalizeTheLocale);
  return browserLocaleList
    .filter((browserLocale) => {
      if (browserLocale.locale !== "*") {
        return normalizedLocales.includes(
          normalizeTheLocale(browserLocale.locale)
        );
      }
      return true;
    })
    .sort((a, b) => {
      // An absent `q=` means quality 1.0 (RFC 7231), while a bare `*` defaults
      // to 0 so it is never ranked above a real locale.
      const qa =
        a.locale === "*" ? (a.qualityValue ?? 0) : (a.qualityValue ?? 1);
      const qb =
        b.locale === "*" ? (b.qualityValue ?? 0) : (b.qualityValue ?? 1);
      return qb - qa;
    });
}

export function getAllCodes(locales: Locales): string[] {
  const result: string[] = [];
  for (const loopLocale of locales) {
    if (typeof loopLocale === "string") {
      result.push(loopLocale);
    } else {
      result.push(...loopLocale.codes);
    }
  }
  return result;
}

export function normalizeTheLocale(locale: string): string {
  return locale.replaceAll("_", "-").toLowerCase();
}
