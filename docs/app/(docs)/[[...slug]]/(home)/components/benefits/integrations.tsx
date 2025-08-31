"use client";

import { motion, useInView } from "motion/react";
import { useRef } from "react";

const lines = [
  "✔ Backed up original state in git stash(5bda95f)",
  "❯ Running tasks for staged files...",
  "  ❯ packages / frontend /.lintstagedrc.json — 1 file",
  "    ↓ *.js — no files[SKIPPED]",
  "    ❯ *.{ ts, tsx, js, jsx } — 1 file",
  "      ⠹ npx ultracite format",
  "◼ Applying modifications from tasks...",
  "◼ Cleaning up temporary files...",
];

export const IntegrationsGraphic = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  return (
    <div className="relative">
      <pre
        className="grid rounded-lg border bg-gradient-to-b from-foreground/2 to-transparent p-6 text-muted-foreground leading-relaxed"
        ref={ref}
      >
        {lines.map((line, index) => (
          <motion.code
            animate={{ opacity: isInView ? 1 : 0 }}
            initial={{ opacity: 0 }}
            key={line}
            transition={{
              duration: 0.3,
              delay: index * 0.3,
              ease: "easeOut",
            }}
          >
            {line}
          </motion.code>
        ))}
      </pre>
      <div className="absolute right-0 bottom-0 left-0 h-20 bg-gradient-to-t from-background to-transparent" />
    </div>
  );
};
