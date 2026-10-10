/*
 * Example a-high-cyclomatic-low-cognitive: 5a: high cyclomatic, low cognitive (flat switch)
 *
 * Source:    microsoft/vscode — src/vs/editor/common/languages.ts, lines 436-469
 * Commit:    959031245ebb1fe077e0d512e1397c0ae82006e4 (2026-10-10T05:36:25Z)
 * Permalink: https://github.com/microsoft/vscode/blob/959031245ebb1fe077e0d512e1397c0ae82006e4/src/vs/editor/common/languages.ts#L436-L469
 * Function:  toLabel (declaration, 34 lines)
 * Scores (measured in place, at the commit above):
 *   sonarjs/cognitive-complexity (eslint-plugin-sonarjs 4.2.2): 1
 *   ESLint core complexity, variant "classic" (eslint 10.12.0): 30
 *   Biome complexity/noExcessiveCognitiveComplexity (@biomejs/biome 2.5.15): <=1 (not reported)
 * The function body (lines 436-469) is copied verbatim.
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

// --- stubs (not in the original): minimal declarations so this file type-checks on its own ---
declare function localize(key: string, message: string): string;
declare const enum CompletionItemKind { Method, Function, Constructor, Field, Variable, Class, Struct, Interface, Module, Property, Event, Operator, Unit, Value, Constant, Enum, EnumMember, Keyword, Text, Color, File, Reference, Customcolor, Folder, TypeParameter, User, Issue, Tool, Snippet }
// --- end stubs ---

	export function toLabel(kind: CompletionItemKind): string {
		switch (kind) {
			case CompletionItemKind.Method: return localize('suggestWidget.kind.method', 'Method');
			case CompletionItemKind.Function: return localize('suggestWidget.kind.function', 'Function');
			case CompletionItemKind.Constructor: return localize('suggestWidget.kind.constructor', 'Constructor');
			case CompletionItemKind.Field: return localize('suggestWidget.kind.field', 'Field');
			case CompletionItemKind.Variable: return localize('suggestWidget.kind.variable', 'Variable');
			case CompletionItemKind.Class: return localize('suggestWidget.kind.class', 'Class');
			case CompletionItemKind.Struct: return localize('suggestWidget.kind.struct', 'Struct');
			case CompletionItemKind.Interface: return localize('suggestWidget.kind.interface', 'Interface');
			case CompletionItemKind.Module: return localize('suggestWidget.kind.module', 'Module');
			case CompletionItemKind.Property: return localize('suggestWidget.kind.property', 'Property');
			case CompletionItemKind.Event: return localize('suggestWidget.kind.event', 'Event');
			case CompletionItemKind.Operator: return localize('suggestWidget.kind.operator', 'Operator');
			case CompletionItemKind.Unit: return localize('suggestWidget.kind.unit', 'Unit');
			case CompletionItemKind.Value: return localize('suggestWidget.kind.value', 'Value');
			case CompletionItemKind.Constant: return localize('suggestWidget.kind.constant', 'Constant');
			case CompletionItemKind.Enum: return localize('suggestWidget.kind.enum', 'Enum');
			case CompletionItemKind.EnumMember: return localize('suggestWidget.kind.enumMember', 'Enum Member');
			case CompletionItemKind.Keyword: return localize('suggestWidget.kind.keyword', 'Keyword');
			case CompletionItemKind.Text: return localize('suggestWidget.kind.text', 'Text');
			case CompletionItemKind.Color: return localize('suggestWidget.kind.color', 'Color');
			case CompletionItemKind.File: return localize('suggestWidget.kind.file', 'File');
			case CompletionItemKind.Reference: return localize('suggestWidget.kind.reference', 'Reference');
			case CompletionItemKind.Customcolor: return localize('suggestWidget.kind.customcolor', 'Custom Color');
			case CompletionItemKind.Folder: return localize('suggestWidget.kind.folder', 'Folder');
			case CompletionItemKind.TypeParameter: return localize('suggestWidget.kind.typeParameter', 'Type Parameter');
			case CompletionItemKind.User: return localize('suggestWidget.kind.user', 'User');
			case CompletionItemKind.Issue: return localize('suggestWidget.kind.issue', 'Issue');
			case CompletionItemKind.Tool: return localize('suggestWidget.kind.tool', 'Tool');
			case CompletionItemKind.Snippet: return localize('suggestWidget.kind.snippet', 'Snippet');
			default: return '';
		}
	}
