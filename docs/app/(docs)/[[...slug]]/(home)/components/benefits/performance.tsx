'use client';

import { motion, useInView } from 'motion/react';
import { useRef } from 'react';

export const PerformanceGraphic = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  // Speedometer configuration
  const maxValue = 100;
  const currentValue = 87; // Near the end to show high performance
  const angle = (currentValue / maxValue) * 180 - 90; // Convert to degrees (-90 to 90)

  return (
    <div className="relative">
      <div
        ref={ref}
        className="relative aspect-[2/1] w-full overflow-hidden rounded-t-full border border-b-0 bg-gradient-to-b from-foreground/5 to-transparent"
      >
        {/* Speed marks */}
        {Array.from({ length: 11 }, (_, i) => {
          const markAngle = (i / 10) * 180 - 90;
          const isMainMark = i % 2 === 0;
          const markLength = isMainMark ? 16 : 8;
          const markValue = (i / 10) * maxValue;

          return (
            <motion.div
              key={`mark-${markValue}`}
              className="absolute bottom-0 left-1/2 origin-bottom"
              style={{
                transform: `translateX(-50%) rotate(${markAngle}deg)`,
                height: '50%',
              }}
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : { opacity: 0 }}
              transition={{
                duration: 0.3,
                delay: i * 0.05,
              }}
            >
              <div
                className="w-px bg-border"
                style={{ height: `${markLength}px` }}
              />
            </motion.div>
          );
        })}

        {/* Needle */}
        <motion.div
          className="absolute bottom-0 left-1/2 origin-bottom"
          style={{
            transform: 'translateX(-50%)',
            height: '100%',
          }}
          initial={{ rotate: -90 }}
          animate={isInView ? { rotate: angle } : { rotate: -90 }}
          transition={{
            duration: 1.5,
            delay: 0.5,
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
        >
          <div className="relative h-full w-px bg-primary" />
        </motion.div>
      </div>
      <div className="absolute right-0 bottom-0 left-0 h-5 bg-gradient-to-t from-background to-transparent" />
    </div>
  );
};
