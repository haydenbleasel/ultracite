/*
 * Length subject C: a long function whose steps share mutable state and skip each other.
 *
 * Source:    microsoft/vscode — src/vs/editor/common/model/indentationGuesser.ts, lines 1-4 and 9-221
 *            (the whole file but its imports)
 * Commit:    959031245ebb1fe077e0d512e1397c0ae82006e4 (2026-10-10T05:36:25Z)
 * Permalink: https://github.com/microsoft/vscode/blob/959031245ebb1fe077e0d512e1397c0ae82006e4/src/vs/editor/common/model/indentationGuesser.ts#L105-L221
 * Function:  guessIndentation(source, defaultTabSize, defaultInsertSpaces), which the editor uses
 *   to guess whether a file is indented with tabs or spaces, and how many spaces make an indent,
 *   from the first 10,000 lines. spacesDiff(), above it, compares two lines' indentation.
 * Rules it hits: see examples.json (measured with length-examples.cjs).
 * Why splitting is risky: the line loop (lines 123-182) carries state from one line to the next
 *   (the previous content line's text and indentation, the tab and space line counts, the tab-size
 *   scores) and reuses one SpacesDiffResult object that spacesDiff() writes into. Its two
 *   `continue` statements skip the rest of the loop: a whitespace-only line changes nothing, and a
 *   line that looks like alignment is dropped entirely, without becoming the previous line, unless
 *   the default settings say it's a real indent. A helper for the loop body has to report both
 *   skips and hand back every piece of state, or it changes the guess on files with alignment or
 *   blank lines. The scoring after the loop (lines 184-213) is pure and can move out safely.
 * What the project did: tuned the heuristics inside this function: microsoft/vscode 12393db6
 *   (2019-01-07, #65668: guess 2 even if it is not the maximum), 1155cdf6 (2019-08-05, #62143:
 *   don't skip alignment lines when they match the default tab size) and microsoft/vscode#284371
 *   (7f4d1c33, 2025-12-26: let 2 beat 4 only with two thirds of 4's count). Each fix changed a
 *   condition in place; the function has never been split.
 * Behaviour to preserve: for every text and default, the same { insertSpaces, tabSize }, including
 *   files with alignment lines, whitespace-only lines, mixed tabs and spaces, lines over 65,536
 *   characters (read through getLineCharCode) and more than 10,000 lines; and spacesDiff's results.
 * Expected response: keep the behaviour and the exported signature. Leave it for review with a
 *   reason, or move out only what is safe (the tab-size scoring, or the indentation count for one
 *   line) and say that the loop stays.
 * Tempting responses: a helper for the loop body that updates the previous line unconditionally
 *   (alignment lines then become the previous line); checking for an empty line after counting the
 *   tab and space lines; a helper that takes and returns all eight pieces of loop state.
 * Gaming moves (measured in examples.json): removing the comments, the commented-out console.log
 *   lines and the blank lines; joining lines (Oxfmt splits them again); a helper with many
 *   parameters.
 * Lines 1-4 and 9-221 are copied verbatim. The stubs between them replace its imports (lines 6-7).
 * Anything marked STUB is not part of the original source.
 *
 * License of the source repository (microsoft/vscode/LICENSE.txt), reproduced in full (also in
 * research/corpus/examples/licenses/vscode-LICENSE.txt):
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

// STUB (not part of the original source): what lines 6-7 import. CharCode holds the three codes
// this file uses, with the values of src/vs/base/common/charCode.ts; ITextBuffer is reduced to
// the four methods guessIndentation calls (src/vs/editor/common/model.ts at the same commit).
const enum CharCode {
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

/**
 * Compute the diff in spaces between two line's indentation.
 */
function spacesDiff(a: string, aLength: number, b: string, bLength: number, result: SpacesDiffResult): void {

	result.spacesDiff = 0;
	result.looksLikeAlignment = false;

	// This can go both ways (e.g.):
	//  - a: "\t"
	//  - b: "\t    "
	//  => This should count 1 tab and 4 spaces

	let i: number;

	for (i = 0; i < aLength && i < bLength; i++) {
		const aCharCode = a.charCodeAt(i);
		const bCharCode = b.charCodeAt(i);

		if (aCharCode !== bCharCode) {
			break;
		}
	}

	let aSpacesCnt = 0, aTabsCount = 0;
	for (let j = i; j < aLength; j++) {
		const aCharCode = a.charCodeAt(j);
		if (aCharCode === CharCode.Space) {
			aSpacesCnt++;
		} else {
			aTabsCount++;
		}
	}

	let bSpacesCnt = 0, bTabsCount = 0;
	for (let j = i; j < bLength; j++) {
		const bCharCode = b.charCodeAt(j);
		if (bCharCode === CharCode.Space) {
			bSpacesCnt++;
		} else {
			bTabsCount++;
		}
	}

	if (aSpacesCnt > 0 && aTabsCount > 0) {
		return;
	}
	if (bSpacesCnt > 0 && bTabsCount > 0) {
		return;
	}

	const tabsDiff = Math.abs(aTabsCount - bTabsCount);
	const spacesDiff = Math.abs(aSpacesCnt - bSpacesCnt);

	if (tabsDiff === 0) {
		// check if the indentation difference might be caused by alignment reasons
		// sometime folks like to align their code, but this should not be used as a hint
		result.spacesDiff = spacesDiff;

		if (spacesDiff > 0 && 0 <= bSpacesCnt - 1 && bSpacesCnt - 1 < a.length && bSpacesCnt < b.length) {
			if (b.charCodeAt(bSpacesCnt) !== CharCode.Space && a.charCodeAt(bSpacesCnt - 1) === CharCode.Space) {
				if (a.charCodeAt(a.length - 1) === CharCode.Comma) {
					// This looks like an alignment desire: e.g.
					// const a = b + c,
					//       d = b - c;
					result.looksLikeAlignment = true;
				}
			}
		}
		return;
	}
	if (spacesDiff % tabsDiff === 0) {
		result.spacesDiff = spacesDiff / tabsDiff;
		return;
	}
}

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

export function guessIndentation(source: ITextBuffer, defaultTabSize: number, defaultInsertSpaces: boolean): IGuessedIndentation {
	// Look at most at the first 10k lines
	const linesCount = Math.min(source.getLineCount(), 10000);

	let linesIndentedWithTabsCount = 0;				// number of lines that contain at least one tab in indentation
	let linesIndentedWithSpacesCount = 0;			// number of lines that contain only spaces in indentation

	let previousLineText = '';						// content of latest line that contained non-whitespace chars
	let previousLineIndentation = 0;				// index at which latest line contained the first non-whitespace char

	const ALLOWED_TAB_SIZE_GUESSES = [2, 4, 6, 8, 3, 5, 7];	// prefer even guesses for `tabSize`, limit to [2, 8].
	const MAX_ALLOWED_TAB_SIZE_GUESS = 8;			// max(ALLOWED_TAB_SIZE_GUESSES) = 8

	const spacesDiffCount = [0, 0, 0, 0, 0, 0, 0, 0, 0];		// `tabSize` scores
	const tmp = new SpacesDiffResult();

	for (let lineNumber = 1; lineNumber <= linesCount; lineNumber++) {
		const currentLineLength = source.getLineLength(lineNumber);
		const currentLineText = source.getLineContent(lineNumber);

		// if the text buffer is chunk based, so long lines are cons-string, v8 will flattern the string when we check charCode.
		// checking charCode on chunks directly is cheaper.
		const useCurrentLineText = (currentLineLength <= 65536);

		let currentLineHasContent = false;			// does `currentLineText` contain non-whitespace chars
		let currentLineIndentation = 0;				// index at which `currentLineText` contains the first non-whitespace char
		let currentLineSpacesCount = 0;				// count of spaces found in `currentLineText` indentation
		let currentLineTabsCount = 0;				// count of tabs found in `currentLineText` indentation
		for (let j = 0, lenJ = currentLineLength; j < lenJ; j++) {
			const charCode = (useCurrentLineText ? currentLineText.charCodeAt(j) : source.getLineCharCode(lineNumber, j));

			if (charCode === CharCode.Tab) {
				currentLineTabsCount++;
			} else if (charCode === CharCode.Space) {
				currentLineSpacesCount++;
			} else {
				// Hit non whitespace character on this line
				currentLineHasContent = true;
				currentLineIndentation = j;
				break;
			}
		}

		// Ignore empty or only whitespace lines
		if (!currentLineHasContent) {
			continue;
		}

		if (currentLineTabsCount > 0) {
			linesIndentedWithTabsCount++;
		} else if (currentLineSpacesCount > 1) {
			linesIndentedWithSpacesCount++;
		}

		spacesDiff(previousLineText, previousLineIndentation, currentLineText, currentLineIndentation, tmp);

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
				continue;
			}
		}

		const currentSpacesDiff = tmp.spacesDiff;
		if (currentSpacesDiff <= MAX_ALLOWED_TAB_SIZE_GUESS) {
			spacesDiffCount[currentSpacesDiff]++;
		}

		previousLineText = currentLineText;
		previousLineIndentation = currentLineIndentation;
	}

	let insertSpaces = defaultInsertSpaces;
	if (linesIndentedWithTabsCount !== linesIndentedWithSpacesCount) {
		insertSpaces = (linesIndentedWithTabsCount < linesIndentedWithSpacesCount);
	}

	let tabSize = defaultTabSize;

	// Guess tabSize only if inserting spaces...
	if (insertSpaces) {
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
		if (tabSize === 4 && spacesDiffCount[4] > 0 && spacesDiffCount[2] > 0 && spacesDiffCount[2] >= spacesDiffCount[4] * 2 / 3) {
			tabSize = 2;
		}
	}

	// console.log('--------------------------');
	// console.log('linesIndentedWithTabsCount: ' + linesIndentedWithTabsCount + ', linesIndentedWithSpacesCount: ' + linesIndentedWithSpacesCount);
	// console.log('spacesDiffCount: ' + spacesDiffCount);
	// console.log('tabSize: ' + tabSize + ', tabSizeScore: ' + tabSizeScore);

	return {
		insertSpaces: insertSpaces,
		tabSize: tabSize
	};
}
