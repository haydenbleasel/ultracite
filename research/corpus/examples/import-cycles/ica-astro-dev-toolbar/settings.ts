/*
 * Import-cycle subject ica (file 1 of 2): a real two-file cycle with a value read during module evaluation.
 *
 * Source:    withastro/astro — packages/astro/src/runtime/client/dev-toolbar/settings.ts (whole file)
 * Commit:    9050e3819c51b0383cced278c278bc6f45c63468 (2026-10-09T13:50:22-04:00)
 * Permalink: https://github.com/withastro/astro/blob/9050e3819c51b0383cced278c278bc6f45c63468/packages/astro/src/runtime/client/dev-toolbar/settings.ts#L1-L69
 * Partner:   ui-library/window.ts (file 2 of 2), same commit.
 * Rules it hits (measured with import-cycles-examples.cjs, see examples.json): Oxlint import/no-cycle on
 *   the import of ./ui-library/window.js; ESLint import-x/no-cycle and Biome noImportCycles on the same
 *   line. window.ts gets the same report on its import of ../settings.js.
 * The cycle: settings.ts imports isValidPlacement (a value) and Placement (a type) from window.ts;
 *   window.ts imports defaultSettings and settings (values) from settings.ts. Both edges survive
 *   compilation, so the cycle exists at runtime.
 * Why it matters: `export const settings = getSettings();` runs at module evaluation and calls
 *   isValidPlacement whenever the page configures a toolbar placement. isValidPlacement reads
 *   `placements`, a const in window.ts. If window.ts is the first of the two modules imported,
 *   settings.ts evaluates before window.ts's body has run, and that read throws "ReferenceError:
 *   Cannot access 'placements' before initialization" (checked by import-cycles-examples.cjs). Astro's
 *   entrypoint.ts imports settings.ts first, so the shipped toolbar works; the hazard is latent.
 * Behaviour to preserve: with settings.ts imported first, settings.config is the same for every
 *   combination of configured placement and saved localStorage settings; isValidPlacement gives the
 *   same answers; a DevToolbarWindow starts at 'bottom-center' and logs an invalid placement through
 *   settings.logger.error; both modules keep their exports.
 * Expected fix: move `placements`, `Placement` and `isValidPlacement` into a module of their own
 *   (e.g. ui-library/placement.ts) that both files import, so settings.ts no longer imports window.ts.
 *   That needs a new file and an edit to window.ts, which Ultracite's agent prompt forbids ("Edit only
 *   the file above"). Within settings.ts alone, the closest correct change is to keep a local copy of
 *   the placement list and check, and import Placement with `import type`.
 * Tempting fixes: `import type { Placement }` while still calling isValidPlacement (a type error);
 *   `await import('./ui-library/window.js')` inside getSettings (makes settings a promise or changes
 *   when the check runs); dropping the placement check (ignores a configured placement); copying
 *   window.ts's code into settings.ts and re-exporting it (the copy and the original diverge); a
 *   require() call (not available in this ESM browser module).
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
import type { DevToolbarMetadata } from './stubs.js'; // STUB: was '../../../types/public/toolbar.js'
import { isValidPlacement, type Placement } from './ui-library/window.js';

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
