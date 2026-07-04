import type { StaticImageData } from "next/image";

import antigravityLogo from "@/assets/logos/antigravity.svg";
import biomeLogo from "@/assets/logos/biome.svg";
import bobLogo from "@/assets/logos/bob.svg";
import claudeLogo from "@/assets/logos/claude.svg";
import codebuddyLogo from "@/assets/logos/codebuddy.svg";
import codexLogo from "@/assets/logos/codex.svg";
import copilotLogo from "@/assets/logos/copilot.svg";
import cursorLogo from "@/assets/logos/cursor.svg";
import eslintLogo from "@/assets/logos/eslint.svg";
import geminiLogo from "@/assets/logos/gemini.svg";
import kiroLogo from "@/assets/logos/kiro.svg";
import opencodeLogo from "@/assets/logos/opencode.svg";
import oxlintLogo from "@/assets/logos/oxlint.svg";
import qwenLogo from "@/assets/logos/qwen.svg";
import traeLogo from "@/assets/logos/trae.svg";
import voidLogo from "@/assets/logos/void.svg";
import vscodeLogo from "@/assets/logos/vscode.svg";
import warpLogo from "@/assets/logos/warp.svg";
import windsurfLogo from "@/assets/logos/windsurf.svg";
import zedLogo from "@/assets/logos/zed.svg";

export const agentLogos: Record<string, StaticImageData> = {
  claude: claudeLogo,
  codex: codexLogo,
  copilot: copilotLogo,
  gemini: geminiLogo,
  opencode: opencodeLogo,
  qwen: qwenLogo,
  warp: warpLogo,
};

export const editorLogos: Record<string, StaticImageData> = {
  antigravity: antigravityLogo,
  bob: bobLogo,
  codebuddy: codebuddyLogo,
  cursor: cursorLogo,
  kiro: kiroLogo,
  trae: traeLogo,
  void: voidLogo,
  vscode: vscodeLogo,
  windsurf: windsurfLogo,
  zed: zedLogo,
};

export const providerLogos: Record<string, StaticImageData> = {
  biome: biomeLogo,
  eslint: eslintLogo,
  oxlint: oxlintLogo,
};

export { default as prettierLogo } from "@/assets/logos/prettier.svg";
export { default as stylelintLogo } from "@/assets/logos/stylelint.svg";
