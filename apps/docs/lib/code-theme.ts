// Ultracite's Shiki themes, built from the brand palette in theme.css: ink
// and paper text, keywords in the accent orange, and warm secondary hues
// (olive strings, sienna types, brick tags, amber literals) instead of the
// default blues and purples. Every color clears 4.5:1 on its code background.
// The homepage's hand-annotated code (components/home/strict.astro) uses the
// same values through the --uc-syntax-* tokens.

interface Palette {
  background: string;
  comment: string;
  foreground: string;
  keyword: string;
  literal: string;
  punctuation: string;
  string: string;
  tag: string;
  type: string;
}

const tokenColors = (palette: Palette) => [
  {
    settings: {
      background: palette.background,
      foreground: palette.foreground,
    },
  },
  {
    scope: ["comment", "punctuation.definition.comment"],
    settings: { fontStyle: "italic", foreground: palette.comment },
  },
  {
    scope: [
      "keyword",
      "storage",
      "storage.type",
      "storage.modifier",
      "keyword.operator.new",
      "keyword.operator.expression",
      "punctuation.definition.template-expression",
    ],
    settings: { foreground: palette.keyword },
  },
  {
    scope: [
      "keyword.operator",
      "punctuation",
      "meta.brace",
      "punctuation.definition.tag",
    ],
    settings: { foreground: palette.punctuation },
  },
  {
    scope: [
      "string",
      "string.quoted",
      "string.template",
      "string.regexp",
      "punctuation.definition.string",
      "markup.inline.raw",
    ],
    settings: { foreground: palette.string },
  },
  {
    scope: [
      "constant.numeric",
      "constant.language",
      "constant.character.escape",
      "constant.other",
      "support.constant",
      "keyword.other.unit",
    ],
    settings: { foreground: palette.literal },
  },
  {
    scope: [
      "entity.name.type",
      "entity.name.class",
      "entity.other.inherited-class",
      "support.type",
      "support.class",
      "entity.other.attribute-name",
    ],
    settings: { foreground: palette.type },
  },
  {
    scope: ["entity.name.tag", "support.class.component"],
    settings: { foreground: palette.tag },
  },
  {
    scope: [
      "variable",
      "variable.parameter",
      "variable.other.property",
      "meta.object-literal.key",
      "entity.name.function",
      "support.function",
      "support.type.property-name",
    ],
    settings: { foreground: palette.foreground },
  },
  {
    scope: ["markup.heading", "entity.name.section"],
    settings: { fontStyle: "bold", foreground: palette.keyword },
  },
  { scope: "markup.bold", settings: { fontStyle: "bold" } },
  { scope: "markup.italic", settings: { fontStyle: "italic" } },
  {
    scope: ["markup.underline.link", "string.other.link"],
    settings: { foreground: palette.type },
  },
  { scope: "markup.inserted", settings: { foreground: palette.string } },
  { scope: "markup.deleted", settings: { foreground: palette.tag } },
];

const theme = (name: string, type: "dark" | "light", palette: Palette) => ({
  colors: {
    "editor.background": palette.background,
    "editor.foreground": palette.foreground,
  },
  name,
  tokenColors: tokenColors(palette),
  type,
});

export const ultraciteLight = theme("ultracite-light", "light", {
  background: "#fbfbf9",
  comment: "#71706a",
  foreground: "#131311",
  keyword: "#c43a0b",
  literal: "#a65a00",
  punctuation: "#63625b",
  string: "#5a6e1c",
  tag: "#a8321c",
  type: "#8f4a12",
});

export const ultraciteDark = theme("ultracite-dark", "dark", {
  background: "#181816",
  comment: "#8a8981",
  foreground: "#f4f3ef",
  keyword: "#ff7a4d",
  literal: "#ffc266",
  punctuation: "#a3a299",
  string: "#b8cf7e",
  tag: "#ff9b80",
  type: "#f2b47a",
});
