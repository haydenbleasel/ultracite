/*
 * Example a-alt-and-chain-equals: 5a (alternate): high cyclomatic, low cognitive (one long && chain)
 *
 * Source:    microsoft/vscode — src/vs/editor/common/viewLayout/viewLineRenderer.ts, lines 182-208
 * Commit:    959031245ebb1fe077e0d512e1397c0ae82006e4 (2026-10-10T05:36:25Z)
 * Permalink: https://github.com/microsoft/vscode/blob/959031245ebb1fe077e0d512e1397c0ae82006e4/src/vs/editor/common/viewLayout/viewLineRenderer.ts#L182-L208
 * Function:  RenderLineInput.equals (method, 27 lines)
 * Scores (measured in place, at the commit above):
 *   sonarjs/cognitive-complexity (eslint-plugin-sonarjs 4.2.2): 1
 *   ESLint core complexity, variant "classic" (eslint 10.12.0): 23
 *   Biome complexity/noExcessiveCognitiveComplexity (@biomejs/biome 2.5.15): <=1 (not reported)
 * The function body (lines 182-208) is copied verbatim.
 * Wrapped in an empty class RenderLineInput so the method parses on its own; the class adds no complexity.
 * Anything marked as a stub or wrapper is not part of the original source.
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

// --- wrapper (not in the original): the method lives in class RenderLineInput ---
class RenderLineInput {
	public equals(other: RenderLineInput): boolean {
		return (
			this.useMonospaceOptimizations === other.useMonospaceOptimizations
			&& this.canUseHalfwidthRightwardsArrow === other.canUseHalfwidthRightwardsArrow
			&& this.lineContent === other.lineContent
			&& this.continuesWithWrappedLine === other.continuesWithWrappedLine
			&& this.isBasicASCII === other.isBasicASCII
			&& this.containsRTL === other.containsRTL
			&& this.fauxIndentLength === other.fauxIndentLength
			&& this.tabSize === other.tabSize
			&& this.startVisibleColumn === other.startVisibleColumn
			&& this.spaceWidth === other.spaceWidth
			&& this.renderSpaceWidth === other.renderSpaceWidth
			&& this.renderSpaceCharCode === other.renderSpaceCharCode
			&& this.stopRenderingLineAfter === other.stopRenderingLineAfter
			&& this.renderWhitespace === other.renderWhitespace
			&& this.renderControlCharacters === other.renderControlCharacters
			&& this.fontLigatures === other.fontLigatures
			&& LineDecoration.equalsArr(this.lineDecorations, other.lineDecorations)
			&& this.lineTokens.equals(other.lineTokens)
			&& this.sameSelection(other.selectionsOnLine)
			&& this.textDirection === other.textDirection
			&& this.verticalScrollbarSize === other.verticalScrollbarSize
			&& this.renderNewLineWhenEmpty === other.renderNewLineWhenEmpty
			&& this.useTwoCellFullwidthCharacters === other.useTwoCellFullwidthCharacters
		);
	}
}
