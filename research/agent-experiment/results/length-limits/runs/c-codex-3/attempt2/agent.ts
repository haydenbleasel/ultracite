/*
 * Source:    microsoft/vscode — src/vs/editor/common/model/indentationGuesser.ts, L1-4 and L9-221 (the
 *            whole file but its imports)
 * Commit:    959031245ebb1fe077e0d512e1397c0ae82006e4 (2026-10-10T05:36:25Z)
 * Permalink: https://github.com/microsoft/vscode/blob/959031245ebb1fe077e0d512e1397c0ae82006e4/src/vs/editor/common/model/indentationGuesser.ts#L105-L221
 * Function:  guessIndentation(source, defaultTabSize, defaultInsertSpaces), which the editor uses
 *   to guess whether a file is indented with tabs or spaces, and how many spaces make an indent.
 * L1-4 and L9-221 are copied, with their formatting changed. The stubs between them replace its
 * imports (L6-7). Anything marked STUB is not part of the original source.
 *
 * License of the source repository (microsoft/vscode/LICENSE.txt), reproduced in full:
 *
 * MIT License
 *
 * Copyright (c) 2015 - present Microsoft Corporation
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

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

// STUB (not part of the original source): what L6-7 import. CharCode holds the three codes
// this file uses, with the values of src/vs/base/common/charCode.ts; ITextBuffer is reduced to
// the four methods guessIndentation calls (src/vs/editor/common/model.ts at the same commit).
enum CharCode {
  Tab = 9,
  Space = 32,
  Comma = 44,
}
interface ITextBuffer {
  getLineCount(): number;
  getLineLength(lineNumber: number): number;
  getLineContent(lineNumber: number): string;
  getLineCharCode(lineNumber: number, index: number): number;
}
// ── end of STUB ────────────────────────────────────────────────────────

class SpacesDiffResult {
  public spacesDiff: number = 0;
  public looksLikeAlignment: boolean = false;
}

const countWhitespace = (text: string, start: number, length: number) => {
  let spacesCount = 0;
  let tabsCount = 0;
  for (let j = start; j < length; j++) {
    const charCode = text.charCodeAt(j);
    if (charCode === CharCode.Space) {
      spacesCount++;
    } else {
      tabsCount++;
    }
  }
  return { spacesCount, tabsCount };
};

const looksLikeAlignment = (
  a: string,
  b: string,
  difference: number,
  bSpacesCnt: number
): boolean => {
  // This looks like an alignment desire: e.g.
  // const a = b + c,
  //       d = b - c;
  return (
    difference > 0 &&
    bSpacesCnt - 1 >= 0 &&
    bSpacesCnt - 1 < a.length &&
    bSpacesCnt < b.length &&
    b.charCodeAt(bSpacesCnt) !== CharCode.Space &&
    a.charCodeAt(bSpacesCnt - 1) === CharCode.Space &&
    a.charCodeAt(a.length - 1) === CharCode.Comma
  );
};

const commonIndentationLength = (
  a: string,
  aLength: number,
  b: string,
  bLength: number
): number => {
  let i: number;
  for (i = 0; i < aLength && i < bLength; i++) {
    const aCharCode = a.charCodeAt(i);
    const bCharCode = b.charCodeAt(i);
    if (aCharCode !== bCharCode) {
      break;
    }
  }
  return i;
};

/**
 * Compute the diff in spaces between two line's indentation.
 */
const spacesDiff = (
  a: string,
  aLength: number,
  b: string,
  bLength: number,
  result: SpacesDiffResult
): void => {
  result.spacesDiff = 0;
  result.looksLikeAlignment = false;

  // This can go both ways (e.g.):
  //  - a: "\t"
  //  - b: "\t    "
  //  => This should count 1 tab and 4 spaces

  const i = commonIndentationLength(a, aLength, b, bLength);
  const aCounts = countWhitespace(a, i, aLength);
  const bCounts = countWhitespace(b, i, bLength);

  if (aCounts.spacesCount > 0 && aCounts.tabsCount > 0) {
    return;
  }
  if (bCounts.spacesCount > 0 && bCounts.tabsCount > 0) {
    return;
  }

  const tabsDiff = Math.abs(aCounts.tabsCount - bCounts.tabsCount);
  const spacesDiff = Math.abs(aCounts.spacesCount - bCounts.spacesCount);

  if (tabsDiff === 0) {
    // check if the indentation difference might be caused by alignment reasons
    // sometime folks like to align their code, but this should not be used as a hint
    result.spacesDiff = spacesDiff;

    result.looksLikeAlignment = looksLikeAlignment(
      a,
      b,
      spacesDiff,
      bCounts.spacesCount
    );
    return;
  }
  if (spacesDiff % tabsDiff === 0) {
    result.spacesDiff = spacesDiff / tabsDiff;
    return;
  }
};

/**
 * Result for a guessIndentation
 */
export interface IGuessedIndentation {
  /**
   * If indentation is based on spaces (`insertSpaces` = true), then what is the number of spaces that make an indent?
   */
  tabSize: number;
  /**
   * Is indentation based on spaces?
   */
  insertSpaces: boolean;
}

const getLineIndentation = (source: ITextBuffer, lineNumber: number) => {
  const currentLineLength = source.getLineLength(lineNumber);
  const currentLineText = source.getLineContent(lineNumber);

  // if the text buffer is chunk based, so long lines are cons-string, v8 will flattern the string when we check charCode.
  // checking charCode on chunks directly is cheaper.
  const useCurrentLineText = currentLineLength <= 65_536;

  let currentLineSpacesCount = 0; // count of spaces found in `currentLineText` indentation
  let currentLineTabsCount = 0; // count of tabs found in `currentLineText` indentation
  for (let j = 0, lenJ = currentLineLength; j < lenJ; j++) {
    const charCode = useCurrentLineText
      ? currentLineText.charCodeAt(j)
      : source.getLineCharCode(lineNumber, j);

    if (charCode === CharCode.Tab) {
      currentLineTabsCount++;
    } else if (charCode === CharCode.Space) {
      currentLineSpacesCount++;
    } else {
      // Hit non whitespace character on this line
      return {
        indentation: j,
        spacesCount: currentLineSpacesCount,
        tabsCount: currentLineTabsCount,
        text: currentLineText,
      };
    }
  }
  return null;
};

const getIndentationDiff = (
  previousLine: { text: string; indentation: number },
  currentLine: { text: string; indentation: number },
  defaultTabSize: number,
  defaultInsertSpaces: boolean,
  tmp: SpacesDiffResult
): number => {
  spacesDiff(
    previousLine.text,
    previousLine.indentation,
    currentLine.text,
    currentLine.indentation,
    tmp
  );
  if (tmp.looksLikeAlignment) {
    // if defaultInsertSpaces === true && the spaces count == tabSize, we may want to count it as valid indentation
    //
    // - item1
    //   - item2
    //
    // otherwise skip this line entirely
    //
    // const a = 1,
    //       b = 2;

    if (!(defaultInsertSpaces && defaultTabSize === tmp.spacesDiff)) {
      return -1;
    }
  }
  return tmp.spacesDiff;
};

const collectIndentationStats = (
  source: ITextBuffer,
  defaultTabSize: number,
  defaultInsertSpaces: boolean
) => {
  // Look at most at the first 10k lines
  const linesCount = Math.min(source.getLineCount(), 10_000);

  const stats = {
    linesIndentedWithSpacesCount: 0, // number of lines that contain only spaces in indentation
    linesIndentedWithTabsCount: 0, // number of lines that contain at least one tab in indentation
    spacesDiffCount: [0, 0, 0, 0, 0, 0, 0, 0, 0], // `tabSize` scores
  };
  let previousLine = { indentation: 0, text: "" };
  const MAX_ALLOWED_TAB_SIZE_GUESS = 8; // max(ALLOWED_TAB_SIZE_GUESSES) = 8
  const tmp = new SpacesDiffResult();

  for (let lineNumber = 1; lineNumber <= linesCount; lineNumber++) {
    const currentLine = getLineIndentation(source, lineNumber);

    // Ignore empty or only whitespace lines
    if (!currentLine) {
      continue;
    }

    if (currentLine.tabsCount > 0) {
      stats.linesIndentedWithTabsCount++;
    } else if (currentLine.spacesCount > 1) {
      stats.linesIndentedWithSpacesCount++;
    }

    const currentSpacesDiff = getIndentationDiff(
      previousLine,
      currentLine,
      defaultTabSize,
      defaultInsertSpaces,
      tmp
    );
    if (currentSpacesDiff === -1) {
      continue;
    }
    if (currentSpacesDiff <= MAX_ALLOWED_TAB_SIZE_GUESS) {
      stats.spacesDiffCount[currentSpacesDiff]++;
    }
    previousLine = currentLine;
  }
  return stats;
};

const guessTabSize = (
  spacesDiffCount: number[],
  defaultTabSize: number
): number => {
  const ALLOWED_TAB_SIZE_GUESSES = [2, 4, 6, 8, 3, 5, 7]; // prefer even guesses for `tabSize`, limit to [2, 8].
  let tabSize = defaultTabSize;
  let tabSizeScore = 0;
  ALLOWED_TAB_SIZE_GUESSES.forEach((possibleTabSize) => {
    const possibleTabSizeScore = spacesDiffCount[possibleTabSize];
    if (possibleTabSizeScore > tabSizeScore) {
      tabSizeScore = possibleTabSizeScore;
      tabSize = possibleTabSize;
    }
  });

  // Let a tabSize of 2 win over 4 only if it has at least 2/3 of the occurrences of 4
  // This helps detect 2-space indentation in cases like YAML files where there might be
  // some 4-space diffs from deeper nesting, while still preferring 4 when it's clearly predominant
  if (
    tabSize === 4 &&
    spacesDiffCount[4] > 0 &&
    spacesDiffCount[2] > 0 &&
    spacesDiffCount[2] >= (spacesDiffCount[4] * 2) / 3
  ) {
    tabSize = 2;
  }
  return tabSize;
};

export const guessIndentation = (
  source: ITextBuffer,
  defaultTabSize: number,
  defaultInsertSpaces: boolean
): IGuessedIndentation => {
  const {
    linesIndentedWithTabsCount,
    linesIndentedWithSpacesCount,
    spacesDiffCount,
  } = collectIndentationStats(source, defaultTabSize, defaultInsertSpaces);

  let insertSpaces = defaultInsertSpaces;
  if (linesIndentedWithTabsCount !== linesIndentedWithSpacesCount) {
    insertSpaces = linesIndentedWithTabsCount < linesIndentedWithSpacesCount;
  }

  // Guess tabSize only if inserting spaces...
  const tabSize = insertSpaces
    ? guessTabSize(spacesDiffCount, defaultTabSize)
    : defaultTabSize;

  // console.log('--------------------------');
  // console.log('linesIndentedWithTabsCount: ' + linesIndentedWithTabsCount + ', linesIndentedWithSpacesCount: ' + linesIndentedWithSpacesCount);
  // console.log('spacesDiffCount: ' + spacesDiffCount);
  // console.log('tabSize: ' + tabSize + ', tabSizeScore: ' + tabSizeScore);

  return {
    insertSpaces,
    tabSize,
  };
};
