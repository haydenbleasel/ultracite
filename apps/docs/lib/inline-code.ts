// Landing-page copy lives in plain strings (so the same text can feed JSON-LD)
// with `backticks` marking inline code. These split it for rendering and strip
// the marks for structured data.

export interface TextSegment {
  code: boolean;
  text: string;
}

export const segments = (text: string): TextSegment[] =>
  text
    .split("`")
    .map((part, index) => ({ code: index % 2 === 1, text: part }))
    .filter((segment) => segment.text.length > 0);

export const plainText = (text: string): string => text.replaceAll("`", "");
