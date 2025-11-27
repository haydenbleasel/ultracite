import { createTokenizer as createJapaneseTokenizer } from "@orama/tokenizers/japanese";
import { createTokenizer as createMandarinTokenizer } from "@orama/tokenizers/mandarin";
import { createFromSource } from "fumadocs-core/search/server";
import { source } from "@/lib/source";

export const { GET } = createFromSource(source, {
  localeMap: {
    da: { language: "danish" },
    nl: { language: "dutch" },
    en: { language: "english" },
    fi: { language: "finnish" },
    fr: { language: "french" },
    de: { language: "german" },
    hu: { language: "hungarian" },
    id: { language: "indonesian" },
    ga: { language: "irish" },
    it: { language: "italian" },
    no: { language: "norwegian" },
    pt: { language: "portuguese" },
    ro: { language: "romanian" },
    sr: { language: "serbian" },
    sl: { language: "slovenian" },
    es: { language: "spanish" },
    sv: { language: "swedish" },
    tr: { language: "turkish" },
    cn: {
      components: {
        tokenizer: createMandarinTokenizer(),
      },
      search: {
        threshold: 0,
        tolerance: 0,
      },
    },
    jp: {
      components: {
        tokenizer: createJapaneseTokenizer(),
      },
      search: {
        threshold: 0,
        tolerance: 0,
      },
    },
  },
});
