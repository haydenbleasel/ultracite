"use client";

import { isValidElement, type ReactNode } from "react";
import { AbsoluteFill, Img, useVideoConfig } from "remotion";

export type BackdropFill =
  | { type: "color"; value: string }
  | { type: "gradient"; value: string }
  | { type: "image"; src: string; fit?: "cover" | "contain" };

export interface BackdropProps {
  fill?: BackdropFill | ReactNode;
  padding?: number;
  radius?: number;
  shadow?: string;
  children?: ReactNode;
  className?: string;
}

const DEFAULT_FILL: BackdropFill = { type: "color", value: "#0a0a0a" };

function FillLayer({ fill }: { fill: BackdropFill }) {
  if (fill.type === "image") {
    return (
      <AbsoluteFill>
        <Img
          src={fill.src}
          style={{
            width: "100%",
            height: "100%",
            objectFit: fill.fit ?? "cover",
          }}
        />
      </AbsoluteFill>
    );
  }

  return <AbsoluteFill style={{ background: fill.value }} />;
}

export function Backdrop({
  fill,
  padding = 4,
  radius = 1,
  shadow = "0 20px 60px rgba(0,0,0,0.4)",
  children,
  className,
}: BackdropProps) {
  const { width } = useVideoConfig();

  const paddingPx = (padding / 100) * width;
  const radiusPx = (radius / 100) * width;

  const fillLayer = isValidElement(fill) ? (
    <AbsoluteFill>{fill}</AbsoluteFill>
  ) : (
    <FillLayer fill={(fill as BackdropFill | undefined) ?? DEFAULT_FILL} />
  );

  return (
    <AbsoluteFill className={className}>
      {fillLayer}
      {children != null && (
        <div
          style={{
            position: "absolute",
            inset: paddingPx,
            overflow: "hidden",
            borderRadius: radiusPx,
            display: "flex",
            ...(shadow === "" ? {} : { boxShadow: shadow }),
          }}
        >
          <div style={{ width: "100%", height: "100%" }}>{children}</div>
        </div>
      )}
    </AbsoluteFill>
  );
}
