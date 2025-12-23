import type { StaticImageData } from "next/image";
import cursorLogo from "../logos/cursor.svg";
import vscodeLogo from "../logos/vscode.svg";
import windsurfLogo from "../logos/windsurf.svg";
import zedLogo from "../logos/zed.svg";

export type EditorCliValue = "vscode" | "zed";

export interface Editor {
  /** Unique identifier for the editor */
  id: string;
  /** Display name */
  name: string;
  /** Short tagline for navbar */
  subtitle: string;
  /** Full description */
  description: string;
  /** Path to the config file the CLI creates */
  configPath: string;
  /** Editor's website URL */
  website: string;
  /** CLI value for --editors flag */
  cliValue: EditorCliValue;
  /** Key features of the editor */
  features: string[];
  /** Logo for UI display */
  logo: StaticImageData;
}

export const editors: Editor[] = [
  {
    id: "vscode",
    name: "Visual Studio Code",
    subtitle: "The most popular code editor",
    description:
      "Microsoft's popular code editor with extensive extension support and built-in Git integration.",
    configPath: ".vscode/settings.json",
    website: "https://code.visualstudio.com",
    cliValue: "vscode",
    features: [
      "Extension marketplace",
      "Integrated terminal",
      "Git integration",
      "IntelliSense",
    ],
    logo: vscodeLogo,
  },
  {
    id: "cursor",
    name: "Cursor",
    subtitle: "The AI-first code editor",
    description:
      "The AI-first code editor built on VS Code with deep AI integration for coding assistance.",
    configPath: ".vscode/settings.json",
    website: "https://cursor.com",
    cliValue: "vscode",
    features: [
      "AI-native editor",
      "Inline completions",
      "Chat interface",
      "Codebase understanding",
    ],
    logo: cursorLogo,
  },
  {
    id: "windsurf",
    name: "Windsurf",
    subtitle: "The agentic IDE by Codeium",
    description:
      "Codeium's agentic IDE that combines AI assistance with a powerful VS Code-based development environment.",
    configPath: ".vscode/settings.json",
    website: "https://codeium.com/windsurf",
    cliValue: "vscode",
    features: [
      "Agentic workflows",
      "Cascade AI system",
      "VS Code compatibility",
      "Multi-file editing",
    ],
    logo: windsurfLogo,
  },
  {
    id: "zed",
    name: "Zed",
    subtitle: "The high-performance editor",
    description:
      "A high-performance, multiplayer code editor built in Rust with built-in AI assistance.",
    configPath: ".zed/settings.json",
    website: "https://zed.dev",
    cliValue: "zed",
    features: [
      "Lightning fast",
      "Collaborative editing",
      "Built-in AI assistant",
      "GPU-accelerated",
    ],
    logo: zedLogo,
  },
];

/** Get all editor IDs */
export const editorIds = editors.map((editor) => editor.id) as [
  string,
  ...string[],
];

/** Get all unique CLI values */
export const editorCliValues: EditorCliValue[] = ["vscode", "zed"];

/** Get an editor by ID */
export const getEditorById = (id: string): Editor | undefined =>
  editors.find((editor) => editor.id === id);

/** Get editors by CLI value */
export const getEditorsByCliValue = (cliValue: EditorCliValue): Editor[] =>
  editors.filter((editor) => editor.cliValue === cliValue);
