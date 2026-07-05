// Logos live in public/logos and are referenced by absolute URL — Astro serves
// them as-is (SVGs are not run through the asset pipeline), so a plain string
// path is all a component needs for an <img src>.

const logo = (name: string): string => `/logos/${name}.svg`;

export const agentLogos: Record<string, string> = {
  claude: logo("claude"),
  codex: logo("codex"),
  copilot: logo("copilot"),
  gemini: logo("gemini"),
  opencode: logo("opencode"),
  qwen: logo("qwen"),
  warp: logo("warp"),
};

export const editorLogos: Record<string, string> = {
  antigravity: logo("antigravity"),
  bob: logo("bob"),
  codebuddy: logo("codebuddy"),
  cursor: logo("cursor"),
  kiro: logo("kiro"),
  trae: logo("trae"),
  void: logo("void"),
  vscode: logo("vscode"),
  windsurf: logo("windsurf"),
  zed: logo("zed"),
};

export const providerLogos: Record<string, string> = {
  biome: logo("biome"),
  eslint: logo("eslint"),
  oxlint: logo("oxlint"),
};

export const prettierLogo = logo("prettier");
export const stylelintLogo = logo("stylelint");
