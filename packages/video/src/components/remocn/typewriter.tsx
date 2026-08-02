"use client";

import { Caret } from "@/components/remocn/caret";
import { useTypewriter } from "@/lib/remocn-ui";

export interface TypewriterProps {
  text: string;
  cursor?: boolean;
  charsPerSecond?: number;
  speed?: number;
  fontSize?: number;
  color?: string;
  cursorColor?: string;
  fontWeight?: number;
  background?: string;
  className?: string;
}

export function Typewriter({
  text,
  cursor = true,
  charsPerSecond = 22,
  speed = 1,
  fontSize = 48,
  color = "#171717",
  cursorColor = "#171717",
  fontWeight = 600,
  background = "white",
  className,
}: TypewriterProps) {
  const tw = useTypewriter(text, { cps: charsPerSecond, speed });

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background,
      }}
    >
      <span
        className={className}
        style={{
          fontSize,
          fontWeight,
          color,
          letterSpacing: "-0.03em",
          fontFamily:
            "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, sans-serif",
          whiteSpace: "pre",
        }}
      >
        {tw.text}
        {cursor && (
          <Caret
            color={cursorColor}
            blink={!tw.typing}
            speed={speed}
            radius={0}
            style={{
              width: "0.08em",
              height: "1em",
              marginLeft: "0.04em",
              verticalAlign: "text-bottom",
            }}
          />
        )}
      </span>
    </div>
  );
}
