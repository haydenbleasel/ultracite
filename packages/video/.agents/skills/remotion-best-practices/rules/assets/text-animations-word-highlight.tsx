import { loadFont } from "@remotion/google-fonts/Inter";
import React from "react";
import {
  AbsoluteFill,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

/*
 * Highlight a word in a sentence with a spring-animated wipe effect.
 */

// Ideal composition size: 1280x720

const COLOR_BG = "#ffffff";
const COLOR_TEXT = "#000000";
const COLOR_HIGHLIGHT = "#A7C7E7";
const FULL_TEXT = "This is Remotion.";
const HIGHLIGHT_WORD = "Remotion";
const FONT_SIZE = 72;
const FONT_WEIGHT = 700;
const HIGHLIGHT_START_FRAME = 30;
const HIGHLIGHT_WIPE_DURATION = 18;

const { fontFamily } = loadFont();

const Highlight: React.FC<{
  word: string;
  color: string;
  delay: number;
  durationInFrames: number;
}> = ({ word, color, delay, durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const highlightProgress = spring({
    config: { damping: 200 },
    delay,
    durationInFrames,
    fps,
    frame,
  });
  const scaleX = Math.max(0, Math.min(1, highlightProgress));

  return (
    <span style={{ display: "inline-block", position: "relative" }}>
      <span
        style={{
          backgroundColor: color,
          borderRadius: "0.18em",
          height: "1.05em",
          left: 0,
          position: "absolute",
          right: 0,
          top: "50%",
          transform: `translateY(-50%) scaleX(${scaleX})`,
          transformOrigin: "left center",
          zIndex: 0,
        }}
      />
      <span style={{ position: "relative", zIndex: 1 }}>{word}</span>
    </span>
  );
};

export const MyAnimation = () => {
  const highlightIndex = FULL_TEXT.indexOf(HIGHLIGHT_WORD);
  const hasHighlight = highlightIndex !== -1;
  const preText = hasHighlight ? FULL_TEXT.slice(0, highlightIndex) : FULL_TEXT;
  const postText = hasHighlight
    ? FULL_TEXT.slice(highlightIndex + HIGHLIGHT_WORD.length)
    : "";

  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        backgroundColor: COLOR_BG,
        fontFamily,
        justifyContent: "center",
      }}
    >
      <div
        style={{
          color: COLOR_TEXT,
          fontSize: FONT_SIZE,
          fontWeight: FONT_WEIGHT,
        }}
      >
        {hasHighlight ? (
          <>
            <span>{preText}</span>
            <Highlight
              word={HIGHLIGHT_WORD}
              color={COLOR_HIGHLIGHT}
              delay={HIGHLIGHT_START_FRAME}
              durationInFrames={HIGHLIGHT_WIPE_DURATION}
            />
            <span>{postText}</span>
          </>
        ) : (
          <span>{FULL_TEXT}</span>
        )}
      </div>
    </AbsoluteFill>
  );
};
