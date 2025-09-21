"use client";

import { motion, useAnimationControls, useInView } from "motion/react";
import { useCallback, useEffect, useRef } from "react";

export const PerformanceGraphic = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const controls = useAnimationControls();

  // Speedometer configuration
  const maxValue = 100;

  // Convert percentage to degrees (-90 to 90 range)
  const percentToAngle = useCallback(
    (percent: number) => (percent / 100) * 180 - 90,
    []
  );

  useEffect(() => {
    if (!isInView) {
      return;
    }

    let isActive = true;

    const runAnimation = async () => {
      // Phase 1: Initial sweep from 0 to 100
      await controls.start({
        rotate: percentToAngle(90),
        transition: {
          delay: 0.5,
          duration: 2,
          ease: [0.25, 0.46, 0.45, 0.85],
        },
      });

      // Phase 2: Oscillating animation between 90-100 with randomness
      const oscillate = async (): Promise<void> => {
        if (!isActive) {
          return;
        }

        // Random target between 80-90
        const randomTarget = 80 + Math.random() * 10;

        await controls.start({
          rotate: percentToAngle(randomTarget),
          transition: {
            duration: 0.05 + Math.random() * 0.1, // Much faster: 0.05-0.15s
            ease: "easeOut", // More abrupt easing for engine-like behavior
          },
        });

        // Much shorter, more jittery pauses for engine maxing out feel
        if (isActive) {
          setTimeout(
            () => {
              if (isActive) {
                // Recursively call oscillate for continuous animation
                oscillate().catch(() => {
                  // Handle potential errors silently
                });
              }
            },
            15 + Math.random() * 45 // Very short pauses: 15-60ms
          );
        }
      };

      oscillate().catch(() => {
        // Handle potential errors silently
      });
    };

    runAnimation().catch(() => {
      // Handle potential errors silently
    });

    // Cleanup function to stop animations when component unmounts
    return () => {
      isActive = false;
    };
  }, [isInView, controls, percentToAngle]);

  return (
    <div className="relative">
      <div
        className="relative aspect-[2/1] w-full overflow-hidden rounded-t-full border border-b-0 bg-gradient-to-b from-foreground/5 to-transparent"
        ref={ref}
      >
        {/* Speed marks */}
        {Array.from({ length: 11 }, (_, i) => {
          const markAngle = (i / 10) * 180 - 90;
          const isMainMark = i % 2 === 0;
          const markLength = isMainMark ? 16 : 8;
          const markValue = (i / 10) * maxValue;

          return (
            <motion.div
              animate={isInView ? { opacity: 1 } : { opacity: 0 }}
              className="absolute bottom-0 left-1/2 origin-bottom"
              initial={{ opacity: 0 }}
              key={`mark-${markValue}`}
              style={{
                height: "90%",
                transform: `translateX(-50%) rotate(${markAngle}deg)`,
              }}
              transition={{
                delay: i * 0.05,
                duration: 0.3,
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
          animate={controls}
          className="absolute bottom-0 left-1/2 origin-bottom"
          initial={{ rotate: percentToAngle(0) }}
          style={{
            height: "100%",
            transform: "translateX(-50%)",
          }}
        >
          <div className="relative h-full w-px bg-primary" />
        </motion.div>
      </div>
      <div className="absolute right-0 bottom-0 left-0 h-5 bg-gradient-to-t from-secondary to-transparent" />
    </div>
  );
};
