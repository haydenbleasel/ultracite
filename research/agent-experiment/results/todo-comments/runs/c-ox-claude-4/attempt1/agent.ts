/*
 * Source:    excalidraw/excalidraw — packages/excalidraw/data/json.ts, lines 25-159 (the whole
 *            file but its imports)
 * Commit:    4c00f31ddcc20086bac1020428819fe0b9a30bce (2026-10-08T11:11:53+02:00)
 * Permalink: https://github.com/excalidraw/excalidraw/blob/4c00f31ddcc20086bac1020428819fe0b9a30bce/packages/excalidraw/data/json.ts#L103-L113
 * Functions: serializeAsJSON, saveAsJSON, loadFromJSON, isValidExcalidrawData, isValidLibrary,
 *            serializeLibraryAsJSON and saveLibraryAsJSON.
 * Lines 25-159 are copied, with their formatting changed. Anything marked STUB is not part of
 * the original source.
 *
 * License of the source repository (excalidraw/excalidraw/LICENSE), reproduced in full:
 *
 * MIT License
 *
 * Copyright (c) 2020 Excalidraw
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

// STUB (not part of the original source): what lines 1-23 import, reduced to what this file
// uses. The constants are copied from packages/common/src/constants.ts at the same commit;
// `harness` supplies the file dialogs, loadFromBlob and the app-state helpers.
const EXPORT_DATA_TYPES = {
  excalidraw: "excalidraw",
  excalidrawClipboard: "excalidraw/clipboard",
  excalidrawClipboardWithAPI: "excalidraw-api/clipboard",
  excalidrawLibrary: "excalidrawlib",
} as const;
const VERSIONS = {
  excalidraw: 2,
  excalidrawLibrary: 2,
} as const;
const MIME_TYPES = {
  excalidraw: "application/vnd.excalidraw+json",
  excalidrawlib: "application/vnd.excalidrawlib+json",
} as const;
type MaybePromise<T> = T | Promise<T>;
interface ExcalidrawElement {
  id: string;
  isDeleted: boolean;
  fileId?: string | null;
}
type BinaryFiles = Record<string, { id: string; dataURL: string }>;
type AppState = Record<string, unknown> & {
  fileHandle: { name: string } | null;
};
type LibraryItems = readonly { id: string }[];
interface ExportedDataState {
  type: string;
  version: number;
  source: string;
  elements: readonly ExcalidrawElement[];
  appState: Record<string, unknown>;
  files: BinaryFiles | undefined;
}
interface ImportedDataState {
  type?: string;
  elements?: readonly ExcalidrawElement[] | null;
  appState?: Record<string, unknown> | null;
}
interface ExportedLibraryData {
  type: string;
  version: number;
  source: string;
  libraryItems: LibraryItems;
}
interface ImportedLibraryData {
  type?: string;
  version?: number;
  libraryItems?: LibraryItems;
}
type FileWithHandle = File & { handle?: { name: string } | null };
export const harness: {
  appStateForDatabase: (appState: Partial<AppState>) => Record<string, unknown>;
  appStateForExport: (appState: Partial<AppState>) => Record<string, unknown>;
  fileOpen: (opts: {
    description: string;
    extensions?: string[];
    multiple?: boolean;
  }) => Promise<FileWithHandle>;
  fileSave: (
    blob: Blob | Promise<Blob>,
    opts: {
      name: string;
      extension: string;
      description: string;
      fileHandle?: { name: string } | null;
    }
  ) => Promise<{ name: string } | null>;
  loadFromBlob: (...args: unknown[]) => Promise<unknown>;
  source: string;
} = {
  appStateForDatabase: (appState) => ({ ...appState }),
  appStateForExport: (appState) => ({ ...appState }),
  fileOpen: async () => {
    throw new Error("harness.fileOpen is not installed");
  },
  fileSave: async () => null,
  loadFromBlob: async () => null,
  source: "https://excalidraw.com",
};
const getExportSource = () => harness.source;
const cleanAppStateForExport = (appState: Partial<AppState>) =>
  harness.appStateForExport(appState);
const clearAppStateForDatabase = (appState: Partial<AppState>) =>
  harness.appStateForDatabase(appState);
// STUB: packages/excalidraw/data/blob.ts L106-L125 (getFileHandleType, isImageFileHandle).
const isImageFileHandle = (handle: { name: string } | null) => {
  const type = handle?.name.match(/\.(json|excalidraw|png|svg)$/)?.[1] || null;
  return type === "png" || type === "svg";
};
const loadFromBlob = (...args: unknown[]) => harness.loadFromBlob(...args);
const fileOpen = (opts: {
  description: string;
  extensions?: string[];
  multiple?: boolean;
}) => harness.fileOpen(opts);
const fileSave = (
  blob: Blob | Promise<Blob>,
  opts: {
    name: string;
    extension: string;
    description: string;
    fileHandle?: { name: string } | null;
  }
) => harness.fileSave(blob, opts);

export interface JSONExportData {
  elements: readonly ExcalidrawElement[];
  appState: AppState;
  files: BinaryFiles;
}

/**
 * Strips out files which are only referenced by deleted elements
 */
const filterOutDeletedFiles = (
  elements: readonly ExcalidrawElement[],
  files: BinaryFiles
) => {
  const nextFiles: BinaryFiles = {};
  for (const element of elements) {
    if (
      !element.isDeleted &&
      "fileId" in element &&
      element.fileId &&
      files[element.fileId]
    ) {
      nextFiles[element.fileId] = files[element.fileId];
    }
  }
  return nextFiles;
};

export const serializeAsJSON = (
  elements: readonly ExcalidrawElement[],
  appState: Partial<AppState>,
  files: BinaryFiles,
  type: "local" | "database"
): string => {
  const data: ExportedDataState = {
    appState:
      type === "local"
        ? cleanAppStateForExport(appState)
        : clearAppStateForDatabase(appState),
    elements,
    files:
      type === "local"
        ? filterOutDeletedFiles(elements, files)
        : // will be stripped from JSON
          undefined,
    source: getExportSource(),
    type: EXPORT_DATA_TYPES.excalidraw,
    version: VERSIONS.excalidraw,
  };

  return JSON.stringify(data, null, 2);
};

export const saveAsJSON = async ({
  data,
  filename,
  fileHandle,
}: {
  data: MaybePromise<JSONExportData>;
  filename: string;
  fileHandle: AppState["fileHandle"];
}) => {
  const blob = Promise.resolve(data).then(({ elements, appState, files }) => {
    const serialized = serializeAsJSON(elements, appState, files, "local");
    return new Blob([serialized], {
      type: MIME_TYPES.excalidraw,
    });
  });

  const savedFileHandle = await fileSave(blob, {
    description: "Excalidraw file",
    extension: "excalidraw",
    fileHandle: isImageFileHandle(fileHandle) ? null : fileHandle,
    name: filename,
  });
  return { fileHandle: savedFileHandle };
};

export const loadFromJSON = async (
  localAppState: AppState,
  localElements: readonly ExcalidrawElement[] | null
) => {
  const file = await fileOpen({
    description: "Excalidraw files",
    // Intentionally over-permissive while https://bugs.webkit.org/show_bug.cgi?id=34442
    // remains unresolved. Else, iOS users cannot open `.excalidraw` files.
    // extensions: ["json", "excalidraw", "png", "svg"],
  });
  return loadFromBlob(file, localAppState, localElements, file.handle);
};

export const isValidExcalidrawData = (data?: {
  type?: any;
  elements?: any;
  appState?: any;
}): data is ImportedDataState =>
  data?.type === EXPORT_DATA_TYPES.excalidraw &&
  (!data.elements ||
    (Array.isArray(data.elements) &&
      (!data.appState || typeof data.appState === "object")));

export const isValidLibrary = (json: any): json is ImportedLibraryData =>
  typeof json === "object" &&
  json &&
  json.type === EXPORT_DATA_TYPES.excalidrawLibrary &&
  (json.version === 1 || json.version === 2);

export const serializeLibraryAsJSON = (libraryItems: LibraryItems) => {
  const data: ExportedLibraryData = {
    libraryItems,
    source: getExportSource(),
    type: EXPORT_DATA_TYPES.excalidrawLibrary,
    version: VERSIONS.excalidrawLibrary,
  };
  return JSON.stringify(data, null, 2);
};

export const saveLibraryAsJSON = async (libraryItems: LibraryItems) => {
  const serialized = serializeLibraryAsJSON(libraryItems);
  await fileSave(
    new Blob([serialized], {
      type: MIME_TYPES.excalidrawlib,
    }),
    {
      description: "Excalidraw library file",
      extension: "excalidrawlib",
      name: "library",
    }
  );
};
