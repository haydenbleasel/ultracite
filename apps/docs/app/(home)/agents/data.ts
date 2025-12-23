import type { StaticImageData } from "next/image";
import {
  agents as agentsData,
  categoryLabels,
  getAgentById as getAgentByIdBase,
  getAgentsByCategory as getAgentsByCategoryBase,
  type Agent as BaseAgent,
  type AgentCategory,
} from "@ultracite/data";
import aiderLogo from "@ultracite/data/logos/aider.svg";
import ampLogo from "@ultracite/data/logos/amp.svg";
import antigravityLogo from "@ultracite/data/logos/antigravity.svg";
import augmentcodeLogo from "@ultracite/data/logos/augmentcode.svg";
import claudeLogo from "@ultracite/data/logos/claude.svg";
import clineLogo from "@ultracite/data/logos/cline.svg";
import codexLogo from "@ultracite/data/logos/codex.svg";
import cursorLogo from "@ultracite/data/logos/cursor.svg";
import droidLogo from "@ultracite/data/logos/droid.svg";
import firebaseStudioLogo from "@ultracite/data/logos/firebase-studio.svg";
import geminiLogo from "@ultracite/data/logos/gemini.svg";
import gooseLogo from "@ultracite/data/logos/goose.svg";
import junieLogo from "@ultracite/data/logos/junie.svg";
import kiloCodeLogo from "@ultracite/data/logos/kilo-code.svg";
import kiroLogo from "@ultracite/data/logos/kiro.svg";
import openHandsLogo from "@ultracite/data/logos/open-hands.svg";
import rooCodeLogo from "@ultracite/data/logos/roo-code.svg";
import vscodeCopilotLogo from "@ultracite/data/logos/vscode-copilot.svg";
import warpLogo from "@ultracite/data/logos/warp.svg";
import windsurfLogo from "@ultracite/data/logos/windsurf.svg";
import zedLogo from "@ultracite/data/logos/zed.svg";

// Logo mapping
const logoMap: Record<string, StaticImageData> = {
  claude: claudeLogo,
  codex: codexLogo,
  cursor: cursorLogo,
  windsurf: windsurfLogo,
  "vscode-copilot": vscodeCopilotLogo,
  zed: zedLogo,
  kiro: kiroLogo,
  cline: clineLogo,
  amp: ampLogo,
  aider: aiderLogo,
  "firebase-studio": firebaseStudioLogo,
  "open-hands": openHandsLogo,
  "gemini-cli": geminiLogo,
  junie: junieLogo,
  augmentcode: augmentcodeLogo,
  "kilo-code": kiloCodeLogo,
  goose: gooseLogo,
  "roo-code": rooCodeLogo,
  warp: warpLogo,
  droid: droidLogo,
  antigravity: antigravityLogo,
};

// Extended agent type with logo for UI
export interface Agent extends BaseAgent {
  logo: StaticImageData;
}

// Add logos to agents
export const agents: Agent[] = agentsData.map((agent) => ({
  ...agent,
  logo: logoMap[agent.id],
}));

// Re-export helpers with logo support
export const getAgentById = (id: string): Agent | undefined => {
  const agent = getAgentByIdBase(id);
  if (!agent) return undefined;
  return { ...agent, logo: logoMap[agent.id] };
};

export const getAgentsByCategory = (category: AgentCategory): Agent[] =>
  getAgentsByCategoryBase(category).map((agent) => ({
    ...agent,
    logo: logoMap[agent.id],
  }));

// Re-export from shared data
export { categoryLabels, type AgentCategory };
