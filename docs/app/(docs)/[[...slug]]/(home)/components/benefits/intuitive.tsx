'use client';

import { motion, useInView } from 'motion/react';
import { useRef } from 'react';

const command = 'npx ultracite format';
const lines = [
  'Diagnostics not shown: 35.',
  'Checked 1740 files in 214ms.',
  'Found 2 errors.',
  'Found 53 warnings.',
  'Done in 312ms.',
];

export const IntuitiveGraphic = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  // Calculate the total duration for the first line typing animation
  const firstLineDuration = lines[0].length * 0.05;

  return (
    <div className="relative">
      <pre
        className="grid rounded-lg border bg-gradient-to-b from-foreground/2 to-transparent p-4 leading-relaxed"
        ref={ref}
      >
        <motion.code
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          className="text-muted-foreground"
          initial={{ opacity: 0 }}
          transition={{
            duration: 0.3,
            delay: 0,
            ease: 'easeOut',
          }}
        >
          <span className="text-muted-foreground/50">$ </span>
          {isInView && (
            <motion.span
              animate={{ opacity: 1 }}
              initial={{ opacity: 0 }}
              transition={{
                duration: 0.05,
                delay: 0.05,
              }}
            >
              {command.split('').map((char, charIndex) => (
                <motion.span
                  animate={{ opacity: 1 }}
                  initial={{ opacity: 0 }}
                  key={charIndex}
                  transition={{
                    duration: 0.05,
                    delay: charIndex * 0.05,
                    ease: 'linear',
                  }}
                >
                  {char}
                </motion.span>
              ))}
            </motion.span>
          )}
        </motion.code>

        <div className="mt-4 grid gap-1">
          {lines.map((line, index) => (
            <motion.code
              animate={{ opacity: isInView ? 1 : 0 }}
              initial={{ opacity: 0 }}
              key={line}
              transition={{
                duration: 0.05,
                delay: firstLineDuration + index * 0.05,
                ease: 'easeOut',
              }}
            >
              {line}
            </motion.code>
          ))}
        </div>
      </pre>
      <div className="absolute right-0 bottom-0 left-0 h-20 bg-gradient-to-t from-background to-transparent" />
    </div>
  );
};
