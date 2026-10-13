/*
 * Source:    microsoft/vscode — src/vs/workbench/contrib/mcp/common/mcpRegistry.ts, lines 328-405
 * Commit:    0204cf08b05ca7425e1758510b673d248a908a5c (2025-04-22T23:19:10Z)
 * Permalink: https://github.com/microsoft/vscode/blob/0204cf08b05ca7425e1758510b673d248a908a5c/src/vs/workbench/contrib/mcp/common/mcpRegistry.ts#L328-L405
 * Function:  McpRegistry.resolveConnection (class method, verbatim). The class around it is reduced
 *            to the fields and services the method uses (marked STUB).
 * Lines 328-405 are copied verbatim. Anything marked STUB is not part of the original source.
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

// STUB (not part of the original source): the types the method uses, reduced to the fields it reads.
// The originals are in src/vs/workbench/contrib/mcp/common/mcpTypes.ts and mcpRegistryTypes.ts.
export interface McpServerLaunch {
	readonly type: 'stdio' | 'http';
	readonly command?: string;
	readonly args?: readonly string[];
	readonly uri?: string;
}
export interface McpServerDefinition {
	readonly id: string;
	readonly label: string;
	readonly launch: McpServerLaunch;
	readonly presentation?: { readonly origin?: { readonly range?: unknown } };
}
export interface McpCollectionDefinition {
	readonly id: string;
	readonly isTrustedByDefault: boolean;
	readonly lazy?: { load(): Promise<void> };
	readonly presentation?: { readonly origin?: string };
	readonly serverDefinitions: { get(): readonly McpServerDefinition[] };
	resolveServerLanch?(definition: McpServerDefinition): Promise<McpServerLaunch | undefined>;
}
export interface IMcpHostDelegate {
	canStart(collection: McpCollectionDefinition, definition: McpServerDefinition): boolean;
}
export interface IMcpServerConnection {
	readonly launch: McpServerLaunch;
}
export interface IMcpResolveConnectionOptions {
	readonly collectionRef: { readonly id: string };
	readonly definitionRef: { readonly id: string };
	readonly forceTrust?: boolean;
	readonly logger: unknown;
}

// STUB: the connection class the method instantiates, and the services it calls.
export class McpServerConnection implements IMcpServerConnection {
	constructor(
		readonly collection: McpCollectionDefinition,
		readonly definition: McpServerDefinition,
		readonly delegate: IMcpHostDelegate,
		readonly launch: McpServerLaunch,
		readonly logger: unknown,
	) { }
}
export const enum Severity {
	Error = 3,
}
export function localize(key: string, message: string, ...args: unknown[]): string {
	return `${key}: ${message.replace(/\{(\d+)\}/g, (match, index) => String(args[Number(index)] ?? match))}`;
}
export interface McpRegistryServices {
	readonly collections: readonly McpCollectionDefinition[];
	readonly delegates: IMcpHostDelegate[];
	readonly trust: Record<string, boolean>;
	promptForTrust(collection: McpCollectionDefinition): Promise<boolean | undefined>;
	replaceVariablesInLaunch(definition: McpServerDefinition, launch: McpServerLaunch): Promise<McpServerLaunch>;
	notify(notification: { severity: Severity; message: string; actions?: unknown }): void;
	openEditor(input: unknown): Promise<unknown>;
}

// STUB: McpRegistry reduced to what resolveConnection uses; the services come from the caller.
export class McpRegistry {
	private readonly _collections: { get(): readonly McpCollectionDefinition[] };
	private readonly _delegates: IMcpHostDelegate[];
	private readonly _trustMemento: { value: { get(): Readonly<Record<string, boolean>>; set(value: Readonly<Record<string, boolean>>, tx: undefined): void } };
	private readonly _notificationService: { notify(notification: { severity: Severity; message: string; actions?: unknown }): void };
	private readonly _editorService: { openEditor(input: unknown): Promise<unknown> };
	private readonly _instantiationService = {
		createInstance: (ctor: typeof McpServerConnection, ...args: ConstructorParameters<typeof McpServerConnection>): IMcpServerConnection => new ctor(...args),
	};

	constructor(private readonly services: McpRegistryServices) {
		this._collections = { get: () => services.collections };
		this._delegates = services.delegates;
		this._trustMemento = {
			value: {
				get: () => services.trust,
				set: (value) => Object.assign(services.trust, value),
			},
		};
		this._notificationService = { notify: (n) => services.notify(n) };
		this._editorService = { openEditor: (input) => services.openEditor(input) };
	}

	private _promptForTrust(collection: McpCollectionDefinition): Promise<boolean | undefined> {
		return this.services.promptForTrust(collection);
	}

	private _replaceVariablesInLaunch(definition: McpServerDefinition, launch: McpServerLaunch): Promise<McpServerLaunch> {
		return this.services.replaceVariablesInLaunch(definition, launch);
	}

	public async resolveConnection({ collectionRef, definitionRef, forceTrust, logger }: IMcpResolveConnectionOptions): Promise<IMcpServerConnection | undefined> {
		let collection = this._collections.get().find(c => c.id === collectionRef.id);
		if (collection?.lazy) {
			await collection.lazy.load();
			collection = this._collections.get().find(c => c.id === collectionRef.id);
		}

		const definition = collection?.serverDefinitions.get().find(s => s.id === definitionRef.id);
		if (!collection || !definition) {
			throw new Error(`Collection or definition not found for ${collectionRef.id} and ${definitionRef.id}`);
		}

		const delegate = this._delegates.find(d => d.canStart(collection, definition));
		if (!delegate) {
			throw new Error('No delegate found that can handle the connection');
		}

		if (!collection.isTrustedByDefault) {
			const memento = this._trustMemento.value.get();
			const trusted = memento.hasOwnProperty(collection.id) ? memento[collection.id] : undefined;

			if (trusted) {
				// continue
			} else if (trusted === undefined || forceTrust) {
				const trustValue = await this._promptForTrust(collection);
				if (trustValue !== undefined) {
					this._trustMemento.value.set({ ...memento, [collection.id]: trustValue }, undefined);
				}
				if (!trustValue) {
					return;
				}
			} else /** trusted === false && !forceTrust */ {
				return undefined;
			}
		}

		let launch: McpServerLaunch | undefined = definition.launch;
		if (collection.resolveServerLanch) {
			launch = await collection.resolveServerLanch(definition);
			if (!launch) {
				return undefined; // interaction cancelled by user
			}
		}

		try {
			launch = await this._replaceVariablesInLaunch(definition, launch);
		} catch (e) {
			this._notificationService.notify({
				severity: Severity.Error,
				message: localize('mcp.launchError', 'Error starting {0}: {1}', definition.label, String(e)),
				actions: {
					primary: collection.presentation?.origin && [
						{
							id: 'mcp.launchError.openConfig',
							class: undefined,
							enabled: true,
							tooltip: '',
							label: localize('mcp.launchError.openConfig', 'Open Configuration'),
							run: () => this._editorService.openEditor({
								resource: collection.presentation!.origin,
								options: { selection: definition.presentation?.origin?.range }
							}),
						}
					]
				}
			});
			return;
		}

		return this._instantiationService.createInstance(
			McpServerConnection,
			collection,
			definition,
			delegate,
			launch,
			logger,
		);
	}
}
