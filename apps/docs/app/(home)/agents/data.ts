import type { StaticImageData } from "next/image";
import {
  agents as agentsData,
  categoryLabels,
  getAgentById as getAgentByIdBase,
  getAgentsByCategory as getAgentsByCategoryBase,
  type Agent as BaseAgent,
  type AgentCategory,
} from "@ultracite/data";
import aiderLogo from "../components/agents/logos/aider.svg";
import ampLogo from "../components/agents/logos/amp.svg";
import antigravityLogo from "../components/agents/logos/antigravity.svg";
import augmentcodeLogo from "../components/agents/logos/augmentcode.svg";
import claudeLogo from "../components/agents/logos/claude.svg";
import clineLogo from "../components/agents/logos/cline.svg";
import codexLogo from "../components/agents/logos/codex.svg";
import cursorLogo from "../components/agents/logos/cursor.svg";
import droidLogo from "../components/agents/logos/droid.svg";
import firebaseStudioLogo from "../components/agents/logos/firebase-studio.svg";
import geminiLogo from "../components/agents/logos/gemini.svg";
import gooseLogo from "../components/agents/logos/goose.svg";
import junieLogo from "../components/agents/logos/junie.svg";
import kiloCodeLogo from "../components/agents/logos/kilo-code.svg";
import kiroLogo from "../components/agents/logos/kiro.svg";
import openHandsLogo from "../components/agents/logos/open-hands.svg";
import rooCodeLogo from "../components/agents/logos/roo-code.svg";
import vscodeCopilotLogo from "../components/agents/logos/vscode-copilot.svg";
import warpLogo from "../components/agents/logos/warp.svg";
import windsurfLogo from "../components/agents/logos/windsurf.svg";
import zedLogo from "../components/agents/logos/zed.svg";

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
