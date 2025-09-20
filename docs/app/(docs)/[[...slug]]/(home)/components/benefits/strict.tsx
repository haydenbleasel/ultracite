"use client";

import { CheckCircleIcon } from "lucide-react";
import { motion, useInView } from "motion/react";
import { useRef } from "react";

const lines = [
  "Don't use `accessKey` attribute on any HTML element.",
  'Don\'t set `aria-hidden="true"` on focusable elements.',
  "Don't add ARIA roles, states, and properties to elements that don't support them.",
  "Don't use distracting elements like `<marquee>` or `<blink>`.",
  "Only use the`scope` prop on`<th>` elements.",
  "Don't assign non-interactive ARIA roles to interactive HTML elements.",
  "Make sure label elements have text content and are associated with an input.",
  "Don't assign interactive ARIA roles to non-interactive HTML elements.",
  "Don't assign `tabIndex` to non-interactive HTML elements.",
  "Don't use positive integers for `tabIndex` property.",
  'Don\'t include "image", "picture", or "photo" in img `alt` prop.',
];

export const StrictGraphic = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  return (
    <div className="relative">
      <div
        className="grid gap-2 font-mono text-muted-foreground text-xs"
        ref={ref}
      >
        {lines.map((line, index) => (
          <motion.div
            animate={{ opacity: isInView ? 1 : 0 }}
            className="flex items-center gap-2"
            initial={{ opacity: 0 }}
            key={line}
            transition={{
              duration: 0.1,
              delay: index * 0.1,
              ease: "easeOut",
            }}
          >
            <CheckCircleIcon className="size-3 shrink-0" />
            <p className="truncate">{line}</p>
          </motion.div>
        ))}
      </div>
      <div className="absolute right-0 bottom-0 left-0 h-20 bg-gradient-to-t from-secondary to-transparent" />
    </div>
  );
};
