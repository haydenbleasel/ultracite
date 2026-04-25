import { editors } from "@repo/data/editors";
import type { options } from "@repo/data/options";

type EditorId = (typeof options.editorConfigs)[number];

export interface EditorFileTarget {
  displayName: string;
  editorIds: EditorId[];
  id: EditorId | "universal";
  path: string;
  promptLabel: string;
  representativeEditorId: EditorId;
}

const buildPromptLabel = (path: string, editorNames: string[]) => {
  if (editorNames.length > 1) {
    const previewNames = editorNames.slice(0, 3);
    const suffix = editorNames.length > previewNames.length ? ", and more" : "";
    return `Universal (creates ${path} for ${previewNames.join(", ")}${suffix})`;
  }

  const [editorName] = editorNames;

  return `${editorName} (creates ${path})`;
};

export const getEditorFileTargets = (): EditorFileTarget[] => {
  const groupedTargets = new Map<string, typeof editors>();

  for (const editor of editors) {
    const existingGroup = groupedTargets.get(editor.config.path) ?? [];
    existingGroup.push(editor);
    groupedTargets.set(editor.config.path, existingGroup);
  }

  const targets = [...groupedTargets.entries()].map(
    ([path, groupedEditors]) => {
      const [representativeEditor] = groupedEditors;
      const editorNames = groupedEditors.map((editor) => editor.name);
      const isUniversal = groupedEditors.length > 1;

      return {
        displayName: isUniversal ? "Universal" : representativeEditor.name,
        editorIds: groupedEditors.map((editor) => editor.id as EditorId),
        id: isUniversal ? "universal" : (representativeEditor.id as EditorId),
        path,
        promptLabel: buildPromptLabel(path, editorNames),
        representativeEditorId: representativeEditor.id as EditorId,
      } satisfies EditorFileTarget;
    }
  );

  return targets.toSorted((left, right) => {
    if (left.id === "universal") {
      return -1;
    }

    if (right.id === "universal") {
      return 1;
    }

    return 0;
  });
};
