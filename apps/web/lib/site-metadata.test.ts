import { describe, expect, test } from "bun:test";

import { createFaqStructuredData } from "./site-metadata.ts";

describe("createFaqStructuredData", () => {
  test("returns a FAQPage payload with question and answer pairs", () => {
    const data = createFaqStructuredData([
      {
        answer: "Ultracite keeps editor configuration consistent.",
        question: "What does Ultracite do?",
      },
    ]);

    expect(data["@type"]).toBe("FAQPage");
    expect(data.mainEntity).toEqual([
      {
        "@type": "Question",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Ultracite keeps editor configuration consistent.",
        },
        name: "What does Ultracite do?",
      },
    ]);
  });
});
