import { readFile } from "node:fs/promises";
import path from "node:path";

import { agents } from "@repo/data/agents";
import { ImageResponse } from "next/og";

export const contentType = "image/png";
export const runtime = "nodejs";
export const size = {
  height: 630,
  width: 1200,
};

interface AgentImageProps {
  params: Promise<{ agent: string }>;
}

const getLogoDataUrl = async (logoFile: string) => {
  const svg = await readFile(
    path.resolve(process.cwd(), "../../packages/data/logos", logoFile),
    "utf-8"
  );

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

export default async function Image({ params }: AgentImageProps) {
  const { agent: agentId } = await params;
  const agent = agents.find((candidate) => candidate.id === agentId);

  if (!agent) {
    throw new Error(`Unknown agent: ${agentId}`);
  }

  const logoDataUrl = await getLogoDataUrl(agent.logoFile);

  return new ImageResponse(
    <div
      style={{
        alignItems: "stretch",
        background: "#f7f7f6",
        color: "#111827",
        display: "flex",
        height: "100%",
        justifyContent: "space-between",
        padding: "64px",
        width: "100%",
      }}
    >
      <div
        style={{
          background:
            "linear-gradient(135deg, rgba(17,24,39,0.96), rgba(31,41,55,0.88))",
          borderRadius: "36px",
          color: "white",
          display: "flex",
          flex: 1,
          flexDirection: "column",
          justifyContent: "space-between",
          marginRight: "32px",
          padding: "52px",
        }}
      >
        <div
          style={{
            color: "rgba(255,255,255,0.72)",
            display: "flex",
            fontSize: "24px",
            fontWeight: 600,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
          }}
        >
          Ultracite
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: "68px",
              fontWeight: 700,
              lineHeight: 1.05,
              maxWidth: "700px",
            }}
          >
            Ultracite for {agent.name}
          </div>
          <div
            style={{
              color: "rgba(255,255,255,0.78)",
              display: "flex",
              fontSize: "28px",
              maxWidth: "720px",
            }}
          >
            {agent.subtitle}
          </div>
        </div>
      </div>
      <div
        style={{
          alignItems: "center",
          background: "white",
          border: "1px solid rgba(17,24,39,0.08)",
          borderRadius: "36px",
          display: "flex",
          justifyContent: "center",
          padding: "36px",
          width: "260px",
        }}
      >
        {/* next/og renders standard HTML in ImageResponse, so next/image is not available here. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt={`${agent.name} logo`}
          height="160"
          src={logoDataUrl}
          style={{
            objectFit: "contain",
          }}
          width="160"
        />
      </div>
    </div>,
    {
      ...size,
    }
  );
}
