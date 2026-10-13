/*
 * Source:    withastro/astro — packages/astro/src/runtime/client/dev-toolbar/settings.ts (whole file)
 * Commit:    9050e3819c51b0383cced278c278bc6f45c63468 (2026-10-09T13:50:22-04:00)
 * Permalink: https://github.com/withastro/astro/blob/9050e3819c51b0383cced278c278bc6f45c63468/packages/astro/src/runtime/client/dev-toolbar/settings.ts#L1-L69
 * Partner:   ui-library/window.ts (file 2 of 2), same commit.
 * Adaptation: the type import of DevToolbarMetadata from ../../../types/public/toolbar.js points to
 *   ./stubs.ts (STUB). Everything else is verbatim.
 *
 * License of the source repository (withastro/astro/LICENSE, the part covering this code):
 *
 * MIT License
 *
 * Copyright (c) 2021 Fred K. Schott
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
// Hand-made mutant for the oracle self-test, not agent output: extract placements, Placement and isValidPlacement into ui-library/placement.ts; settings.ts and window.ts import it, and window.ts re-exports the three names (the expected fix; it creates a file and edits window.ts)
import type { DevToolbarMetadata } from './stubs.js'; // STUB: was '../../../types/public/toolbar.js'
import { isValidPlacement, type Placement } from './ui-library/placement.js';

export interface Settings {
	disableAppNotification: boolean;
	verbose: boolean;
	placement: Placement;
}

export const defaultSettings = {
	disableAppNotification: false,
	verbose: false,
	placement: 'bottom-center',
} satisfies Settings;

export const settings = getSettings();

function getSettings() {
	// 1. Start with hardcoded defaults
	let _settings: Settings = { ...defaultSettings };

	// 2. Override with config placement (if provided)
	const configPlacement = (globalThis as DevToolbarMetadata).__astro_dev_toolbar__?.placement;
	if (configPlacement && isValidPlacement(configPlacement)) {
		_settings.placement = configPlacement;
	}

	// 3. Override with localStorage (preserves user's UI choice)
	const toolbarSettings = localStorage.getItem('astro:dev-toolbar:settings');

	if (toolbarSettings) {
		_settings = { ..._settings, ...JSON.parse(toolbarSettings) };
	}

	function updateSetting<Key extends keyof Settings>(key: Key, value: Settings[Key]) {
		_settings[key] = value;
		localStorage.setItem('astro:dev-toolbar:settings', JSON.stringify(_settings));
	}

	function log(message: string, level: 'log' | 'warn' | 'error' = 'log') {
		// biome-ignore lint/suspicious/noConsole: it can't infer types yet
		console[level](
			`%cAstro`,
			'background: linear-gradient(66.77deg, #D83333 0%, #F041FF 100%); color: white; padding-inline: 4px; border-radius: 2px; font-family: monospace;',
			message,
		);
	}

	return {
		get config() {
			return _settings;
		},
		updateSetting,
		logger: {
			log,
			warn: (message: string) => {
				log(message, 'warn');
			},
			error: (message: string) => {
				log(message, 'error');
			},
			verboseLog: (message: string) => {
				if (_settings.verbose) {
					log(message);
				}
			},
		},
	};
}
