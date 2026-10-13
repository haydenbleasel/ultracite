/*
 * Source:    withastro/astro — packages/astro/src/runtime/client/dev-toolbar/ui-library/window.ts (whole file)
 * Commit:    9050e3819c51b0383cced278c278bc6f45c63468 (2026-10-09T13:50:22-04:00)
 * Permalink: https://github.com/withastro/astro/blob/9050e3819c51b0383cced278c278bc6f45c63468/packages/astro/src/runtime/client/dev-toolbar/ui-library/window.ts#L1-L140
 * Partner:   ../settings.ts (file 1 of 2), same commit.
 * Verbatim.
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
import { defaultSettings, settings } from '../settings.js';

export const placements = ['bottom-left', 'bottom-center', 'bottom-right'] as const;

export type Placement = (typeof placements)[number];

export function isValidPlacement(value: string): value is Placement {
	return placements.map(String).includes(value);
}

export class DevToolbarWindow extends HTMLElement {
	shadowRoot: ShadowRoot;
	_placement: Placement = defaultSettings.placement;

	get placement() {
		return this._placement;
	}
	set placement(value) {
		if (!isValidPlacement(value)) {
			settings.logger.error(
				`Invalid placement: ${value}, expected one of ${placements.join(', ')}, got ${value}.`,
			);
			return;
		}
		this._placement = value;
		this.updateStyle();
	}

	static observedAttributes = ['placement'];

	constructor() {
		super();
		this.shadowRoot = this.attachShadow({ mode: 'open' });
	}

	async connectedCallback() {
		this.shadowRoot.innerHTML = `
			<style>
				:host {
					box-sizing: border-box;
					display: flex;
					flex-direction: column;
					background: linear-gradient(0deg, #13151A, #13151A), linear-gradient(0deg, #343841, #343841);
					border: 1px solid rgba(52, 56, 65, 1);
					width: min(640px, 100%);
					max-height: 480px;
					border-radius: 12px;
					padding: 24px;
					font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
					color: rgba(191, 193, 201, 1);
					position: fixed;
					z-index: 999999999;
					bottom: 72px;
					box-shadow: 0px 0px 0px 0px rgba(19, 21, 26, 0.30), 0px 1px 2px 0px rgba(19, 21, 26, 0.29), 0px 4px 4px 0px rgba(19, 21, 26, 0.26), 0px 10px 6px 0px rgba(19, 21, 26, 0.15), 0px 17px 7px 0px rgba(19, 21, 26, 0.04), 0px 26px 7px 0px rgba(19, 21, 26, 0.01);
				}

				@media (forced-colors: active) {
					:host {
						background: white;
					}
				}

				@media (max-width: 640px) {
					:host {
						border-radius: 0;
					}
				}

				::slotted(h1), ::slotted(h2), ::slotted(h3), ::slotted(h4), ::slotted(h5) {
					font-weight: 600;
					color: #fff;
				}

				::slotted(h1) {
					font-size: 22px;
				}

				::slotted(h2) {
					font-size: 20px;
				}

				::slotted(h3) {
					font-size: 18px;
				}

				::slotted(h4) {
					font-size: 16px;
				}

				::slotted(h5) {
					font-size: 14px;
				}

				hr, ::slotted(hr) {
					border: 1px solid rgba(27, 30, 36, 1);
					margin: 1em 0;
				}

				p, ::slotted(p) {
					line-height: 1.5em;
				}
			</style>
			<style id="selected-style"></style>

			<slot />
		`;

		this.updateStyle();
	}

	attributeChangedCallback() {
		if (this.hasAttribute('placement'))
			this.placement = this.getAttribute('placement') as Placement;
	}

	updateStyle() {
		const style = this.shadowRoot.querySelector<HTMLStyleElement>('#selected-style');
		if (style) {
			const styleMap: Record<Placement, string> = {
				'bottom-left': `
					:host {
						left: 16px;
					}
				`,
				'bottom-center': `
					:host {
						left: 50%;
						transform: translateX(-50%);
					}
				`,
				'bottom-right': `
					:host {
						right: 16px;
					}
				`,
			};
			style.innerHTML = styleMap[this.placement];
		}
	}
}
