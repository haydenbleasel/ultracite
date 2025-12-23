import type { StaticImageData } from "next/image";
import {
  editors as editorsData,
  getEditorById as getEditorByIdBase,
  type Editor as BaseEditor,
  type EditorCliValue,
} from "@ultracite/data";
import cursorLogo from "@ultracite/data/logos/cursor.svg";
import vscodeLogo from "@ultracite/data/logos/vscode.svg";
import windsurfLogo from "@ultracite/data/logos/windsurf.svg";
import zedLogo from "@ultracite/data/logos/zed.svg";

// Logo mapping
const logoMap: Record<string, StaticImageData> = {
  vscode: vscodeLogo,
  cursor: cursorLogo,
  windsurf: windsurfLogo,
  zed: zedLogo,
};

// Extended editor type with logo for UI
export interface Editor extends BaseEditor {
  logo: StaticImageData;
}

// Add logos to editors
export const editors: Editor[] = editorsData.map((editor) => ({
  ...editor,
  logo: logoMap[editor.id],
}));

// Re-export helpers with logo support
export const getEditorById = (id: string): Editor | undefined => {
  const editor = getEditorByIdBase(id);
  if (!editor) return undefined;
  return { ...editor, logo: logoMap[editor.id] };
};

// Re-export from shared data
export type { EditorCliValue };
