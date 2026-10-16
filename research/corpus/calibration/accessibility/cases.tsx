// Calibration cases for the accessibility rules. Each case starts with a marker comment:
//   // C01: description                      a base case (a barrier, or the right way to write it)
//   // E01 (C01, fixes: no): description     an edit to base case C01, and whether the edit removes
//                                            the barrier for users (yes / no / partly), judged by
//                                            the WAI-ARIA Authoring Practices button and link
//                                            patterns and the HTML spec, not by any linter
// a11y-linters.cjs maps every diagnostic to the case whose marker precedes its line.
import type { ComponentProps, KeyboardEvent, ReactNode } from "react";

declare const open: () => void;
declare const remove: () => void;
declare const src: string;
declare const alt: string;
declare const title: string;
declare const props: ComponentProps<"div">;
declare const imgProps: ComponentProps<"img">;
declare const buttonProps: ComponentProps<"div">;
declare const t: (key: string) => string;
declare function Label(p: { children?: ReactNode; htmlFor?: string }): ReactNode;
declare function Input(p: { id?: string; type?: string }): ReactNode;
declare function Image(p: { src: string; alt?: string }): ReactNode;
declare function IconButton(p: { icon: ReactNode; onClick: () => void }): ReactNode;
declare function CloseIcon(): ReactNode;

const onKeyActivate = (event: KeyboardEvent) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    open();
  }
};
const onEscapeOnly = (event: KeyboardEvent) => {
  if (event.key === "Escape") {
    remove();
  }
};
const onEnterOnly = (event: KeyboardEvent) => {
  if (event.key === "Enter") {
    open();
  }
};

// ── clickable elements ────────────────────────────────────────────────
// C01: div with onClick, no role, tabIndex or key handler
export const C01 = () => <div onClick={open}>Open</div>;

// C02: div with onClick and role="button" only
export const C02 = () => (
  <div onClick={open} role="button">
    Open
  </div>
);

// C03: div with onClick, role="button" and tabIndex={0}, no key handler
export const C03 = () => (
  <div onClick={open} role="button" tabIndex={0}>
    Open
  </div>
);

// C04: div with onClick, role="button", tabIndex={0} and a key handler for Enter and Space
export const C04 = () => (
  <div onClick={open} onKeyDown={onKeyActivate} role="button" tabIndex={0}>
    Open
  </div>
);

// C05: span with onClick (static element)
export const C05 = () => <span onClick={open}>Open</span>;

// C06: li with onClick (non-interactive element)
export const C06 = () => (
  <ul>
    <li onClick={open}>Open</li>
  </ul>
);

// C07: native button with type and onClick (the right fix for C01)
export const C07 = () => (
  <button onClick={open} type="button">
    Open
  </button>
);

// C08: div with onClick and spread props
export const C08 = () => (
  <div {...props} onClick={open}>
    Open
  </div>
);

// C09: div with onMouseOver and no onFocus
export const C09 = () => <div onMouseOver={open}>Preview</div>;

// C10: div whose props come from a hook (React Aria style: role, tabIndex and key handlers in a spread)
export const C10 = () => <div {...buttonProps}>Open</div>;

// C11: spread object literal carrying role="button" and onClick
export const C11 = () => <div {...{ onClick: open, role: "button" }}>Open</div>;

// C12: a component named Button that renders a div with onClick, used with onClick
const FakeButton = ({ children, onClick }: { children: ReactNode; onClick: () => void }) => (
  <div className="btn" onClick={onClick}>
    {children}
  </div>
);
export const C12 = () => <FakeButton onClick={open}>Open</FakeButton>;

// E01 (C01, fixes: no): add onKeyDown={() => {}}
export const E01 = () => (
  <div onClick={open} onKeyDown={() => {}}>
    Open
  </div>
);

// E02 (C01, fixes: no): add role="button" tabIndex={0} onKeyDown={() => {}}
export const E02 = () => (
  <div onClick={open} onKeyDown={() => {}} role="button" tabIndex={0}>
    Open
  </div>
);

// E03 (C01, fixes: partly): add role="button" and tabIndex={0} (focusable, announced, but Enter and Space do nothing)
export const E03 = () => (
  <div onClick={open} role="button" tabIndex={0}>
    Open
  </div>
);

// E04 (C01, fixes: no): add role="presentation"
export const E04 = () => (
  <div onClick={open} role="presentation">
    Open
  </div>
);

// E05 (C01, fixes: no): add aria-hidden="true"
export const E05 = () => (
  <div aria-hidden="true" onClick={open}>
    Open
  </div>
);

// E06 (C01, fixes: no): role, tabIndex and an onKeyDown that handles Escape only
export const E06 = () => (
  <div onClick={open} onKeyDown={onEscapeOnly} role="button" tabIndex={0}>
    Open
  </div>
);

// E07 (C01, fixes: partly): role, tabIndex and an onKeyDown that handles Enter only (Space does nothing)
export const E07 = () => (
  <div onClick={open} onKeyDown={onEnterOnly} role="button" tabIndex={0}>
    Open
  </div>
);

// E08 (C01, fixes: yes): role, tabIndex and an onKeyDown for Enter and Space (the ARIA button pattern)
export const E08 = () => (
  <div onClick={open} onKeyDown={onKeyActivate} role="button" tabIndex={0}>
    Open
  </div>
);

// E09 (C01, fixes: yes): replace the div with <button type="button">
export const E09 = () => (
  <button onClick={open} type="button">
    Open
  </button>
);

// E10 (C01, fixes: no): move the props into a spread
export const E10 = () => <div {...{ onClick: open }}>Open</div>;

// E11 (C01, fixes: no): rename the handler prop through a wrapper component
const Clickable = (p: { onPress: () => void; children: ReactNode }) => (
  <div onClick={p.onPress}>{p.children}</div>
);
export const E11 = () => <Clickable onPress={open}>Open</Clickable>;

// E12 (C01, fixes: no): add onKeyUp={open} without role or tabIndex (not focusable, so never fires)
export const E12 = () => (
  <div onClick={open} onKeyUp={open}>
    Open
  </div>
);

// E13 (C01, fixes: no): role="button" tabIndex={-1} onKeyDown={onKeyActivate} (not in the tab order)
export const E13 = () => (
  <div onClick={open} onKeyDown={onKeyActivate} role="button" tabIndex={-1}>
    Open
  </div>
);

// ── images ────────────────────────────────────────────────────────────
// I01: img with no alt
export const I01 = () => <img src="/chart.png" />;

// I02: img with an alt that describes it
export const I02 = () => <img alt="Revenue rose 40% in March" src="/chart.png" />;

// I03: img with a dynamic alt
export const I03 = () => <img alt={alt} src={src} />;

// I04: img with a filename as alt
export const I04 = () => <img alt="chart-2024-03.png" src="/chart-2024-03.png" />;

// I05: img with redundant words in alt
export const I05 = () => <img alt="Image of the revenue chart" src="/chart.png" />;

// I06: img with alt={undefined}
export const I06 = () => <img alt={undefined} src="/chart.png" />;

// I07: img with spread props and no alt
export const I07 = () => <img {...imgProps} />;

// I08: input type="image" with no alt
export const I08 = () => <input src="/submit.png" type="image" />;

// I09: a component named Image (next/image style) with no alt
export const I09 = () => <Image src="/chart.png" />;

// I10: inline svg icon with no title or name
export const I10 = () => (
  <svg viewBox="0 0 16 16">
    <path d="M0 0h16v16H0z" />
  </svg>
);

// I11: img alt from a translation call
export const I11 = () => <img alt={t("chart.alt")} src="/chart.png" />;

// E20 (I01, fixes: no): add alt="" to an informative image (marks it decorative)
export const E20 = () => <img alt="" src="/chart.png" />;

// E21 (I01, fixes: no): add aria-hidden="true" to an informative image
export const E21 = () => <img aria-hidden="true" src="/chart.png" />;

// E22 (I01, fixes: no): add role="presentation" to an informative image
export const E22 = () => <img role="presentation" src="/chart.png" />;

// E23 (I01, fixes: no): add alt="image" (a meaningless alt)
export const E23 = () => <img alt="image" src="/chart.png" />;

// E24 (I01, fixes: no): add alt="chart.png" (the filename)
export const E24 = () => <img alt="chart.png" src="/chart.png" />;

// E25 (I01, fixes: no): add alt={""} as an expression
export const E25 = () => <img alt={""} src="/chart.png" />;

// E26 (I01, fixes: no): add alt={src} (a dynamic value that is the URL)
export const E26 = () => <img alt={src} src={src} />;

// E27 (I01, fixes: yes): add an alt that says what the chart shows
export const E27 = () => <img alt="Revenue rose 40% in March" src="/chart.png" />;

// E28 (I01, fixes: no): add title="chart" instead of alt
export const E28 = () => <img src="/chart.png" title="chart" />;

// E29 (I01, fixes: no): add aria-label="" (empty)
export const E29 = () => <img aria-label="" src="/chart.png" />;

// ── links ─────────────────────────────────────────────────────────────
// A01: a href="#" with onClick
export const A01 = () => (
  <a href="#" onClick={remove}>
    Delete
  </a>
);

// A02: a with onClick and no href
export const A02 = () => <a onClick={remove}>Delete</a>;

// A03: a href="javascript:void(0)"
export const A03 = () => <a href="javascript:void(0)">Delete</a>;

// A04: a with no content
export const A04 = () => <a href="/docs" />;

// A05: a with ambiguous text
export const A05 = () => <a href="/docs">click here</a>;

// A06: a with only an icon and no name
export const A06 = () => (
  <a href="/settings">
    <CloseIcon />
  </a>
);

// E30 (A01, fixes: no): href="#" changed to href="#!" (still not a destination)
export const E30 = () => (
  <a href="#!" onClick={remove}>
    Delete
  </a>
);

// E31 (A01, fixes: no): add role="button" to the anchor (no Space key, still a link in the DOM)
export const E31 = () => (
  <a href="#" onClick={remove} role="button">
    Delete
  </a>
);

// E32 (A01, fixes: yes): replace the anchor with <button type="button">
export const E32 = () => (
  <button onClick={remove} type="button">
    Delete
  </button>
);

// E33 (A04, fixes: no): add aria-hidden to the empty anchor (still focusable)
export const E33 = () => <a aria-hidden="true" href="/docs" />;

// E34 (A05, fixes: no): append "click here" to aria-label only
export const E34 = () => (
  <a aria-label="click here" href="/docs">
    Docs
  </a>
);

// ── ARIA and focus ────────────────────────────────────────────────────
// R01: aria-hidden on a button
export const R01 = () => (
  <button aria-hidden="true" onClick={remove} type="button">
    Close
  </button>
);

// R02: aria-hidden on a focusable div
export const R02 = () => (
  <div aria-hidden="true" tabIndex={0}>
    Menu
  </div>
);

// R03: invalid aria-* attribute (misspelled aria-labelledby)
export const R03 = () => <div aria-labeledby="heading">Panel</div>;

// R04: redundant role on a button
export const R04 = () => (
  <button role="button" type="button">
    Save
  </button>
);

// R05: invalid role value
export const R05 = () => <div role="buton">Save</div>;

// R06: role="checkbox" without aria-checked
export const R06 = () => (
  <div role="checkbox" tabIndex={0}>
    Remember me
  </div>
);

// R07: aria-checked on a role that doesn't support it
export const R07 = () => (
  <button aria-checked="true" type="button">
    Save
  </button>
);

// R08: positive tabIndex
export const R08 = () => <input tabIndex={2} type="text" />;

// R09: tabIndex={0} on a non-interactive element
export const R09 = () => <span tabIndex={0}>Status</span>;

// R10: autoFocus on an input
export const R10 = () => <input autoFocus type="search" />;

// R11: interactive role on a non-interactive element (li role="button")
export const R11 = () => (
  <ul>
    <li role="button">Open</li>
  </ul>
);

// R12: non-interactive role on an interactive element (button role="presentation")
export const R12 = () => (
  <button role="presentation" type="button">
    Save
  </button>
);

// R13: role="navigation" on a div (a tag exists)
export const R13 = () => <div role="navigation">Links</div>;

// R14: aria-activedescendant on a div without tabIndex
export const R14 = () => <div aria-activedescendant="option-1">Options</div>;

// R15: aria-* value of the wrong type
export const R15 = () => <div aria-hidden="yes">Panel</div>;

// R16: accessKey
export const R16 = () => <button accessKey="s" type="button">Save</button>;

// R17: aria-hidden via a dynamic value on a button
declare const hidden: boolean;
export const R17 = () => (
  <button aria-hidden={hidden} type="button">
    Close
  </button>
);

// R18: dynamic role
declare const role: "button" | "link";
export const R18 = () => <div role={role}>Open</div>;

// R19: dynamic tabIndex
declare const index: number;
export const R19 = () => <div tabIndex={index}>Panel</div>;

// R20: tabIndex={1} as a string
export const R20 = () => <input tabIndex={"1" as unknown as number} type="text" />;

// E40 (R01, fixes: no): aria-hidden moved onto a wrapper around the button
export const E40 = () => (
  <div aria-hidden="true">
    <button onClick={remove} type="button">
      Close
    </button>
  </div>
);

// E41 (R01, fixes: no): add tabIndex={-1} to the hidden button (still clickable, and still focusable by script)
export const E41 = () => (
  <button aria-hidden="true" onClick={remove} tabIndex={-1} type="button">
    Close
  </button>
);

// E42 (R08, fixes: partly): change tabIndex={2} to tabIndex={0}
export const E42 = () => <input tabIndex={0} type="text" />;

// E43 (R03, fixes: no): rename to data-labeledby
export const E43 = () => <div data-labeledby="heading">Panel</div>;

// E44 (R06, fixes: partly): add aria-checked="false" (state never updates)
export const E44 = () => (
  <div aria-checked="false" role="checkbox" tabIndex={0}>
    Remember me
  </div>
);

// ── labels and forms ──────────────────────────────────────────────────
// L01: label with text and no control, input outside it with no id
export const L01 = () => (
  <>
    <label>Name</label>
    <input type="text" />
  </>
);

// L02: label htmlFor and input id
export const L02 = () => (
  <>
    <label htmlFor="name">Name</label>
    <input id="name" type="text" />
  </>
);

// L03: label wrapping its input
export const L03 = () => (
  <label>
    Name <input type="text" />
  </label>
);

// L04: input with no label at all
export const L04 = () => <input type="text" />;

// L05: custom Label and Input, not nested or linked
export const L05 = () => (
  <>
    <Label>Email</Label>
    <Input type="email" />
  </>
);

// L06: custom Label wrapping a custom Input
export const L06 = () => (
  <Label>
    Email <Input type="email" />
  </Label>
);

// L07: custom Label htmlFor and custom Input id
export const L07 = () => (
  <>
    <Label htmlFor="email">Email</Label>
    <Input id="email" type="email" />
  </>
);

// L08: label with its input three wrappers deep
export const L08 = () => (
  <label>
    Name
    <span>
      <span>
        <input type="text" />
      </span>
    </span>
  </label>
);

// L09: label with its input four wrappers deep
export const L09 = () => (
  <label>
    Name
    <span>
      <span>
        <span>
          <input type="text" />
        </span>
      </span>
    </span>
  </label>
);

// L10: input with only a placeholder
export const L10 = () => <input placeholder="Email" type="email" />;

// L11: select with no label
export const L11 = () => (
  <select>
    <option>One</option>
  </select>
);

// L12: label htmlFor with no text
export const L12 = () => (
  <>
    <label htmlFor="q" />
    <input id="q" type="search" />
  </>
);

// L13: label with dynamic text and htmlFor
export const L13 = () => (
  <>
    <label htmlFor="q">{title}</label>
    <input id="q" type="search" />
  </>
);

// L14: invalid autocomplete token
export const L14 = () => <input autoComplete="nope" type="email" />;

// E50 (L01, fixes: no): add htmlFor="name" to the label but no id on the input
export const E50 = () => (
  <>
    <label htmlFor="name">Name</label>
    <input type="text" />
  </>
);

// E51 (L01, fixes: no): replace the label with a span
export const E51 = () => (
  <>
    <span>Name</span>
    <input type="text" />
  </>
);

// E52 (L04, fixes: partly): add aria-label="input" (a meaningless name)
export const E52 = () => <input aria-label="input" type="text" />;

// E53 (L04, fixes: yes): wrap in a label with text
export const E53 = () => (
  <label>
    Name <input type="text" />
  </label>
);

// ── buttons and other elements ─────────────────────────────────────────
// B01: button without type
export const B01 = () => <button onClick={open}>Save</button>;

// B02: icon-only button with no name
export const B02 = () => (
  <button onClick={remove} type="button">
    <CloseIcon />
  </button>
);

// B03: icon-only button with aria-label
export const B03 = () => (
  <button aria-label="Close" onClick={remove} type="button">
    <CloseIcon />
  </button>
);

// B04: icon-only native button with an inline svg and no name
export const B04 = () => (
  <button onClick={remove} type="button">
    <svg viewBox="0 0 16 16">
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
  </button>
);

// B05: custom IconButton with only an icon
export const B05 = () => <IconButton icon={<CloseIcon />} onClick={remove} />;

// B06: visually hidden button (sr-only)
export const B06 = () => (
  <button className="sr-only" type="button">
    Skip
  </button>
);

// B07: title attribute as the only name of a button
export const B07 = () => (
  <button onClick={remove} title="Close" type="button">
    <CloseIcon />
  </button>
);

// B08: aria-label in kebab case
export const B08 = () => (
  <button aria-label="close-dialog" onClick={remove} type="button">
    <CloseIcon />
  </button>
);

// B09: button nested in a link
export const B09 = () => (
  <a href="/docs">
    <button type="button">Docs</button>
  </a>
);

// E60 (B02, fixes: no): add aria-hidden="true" to the button
export const E60 = () => (
  <button aria-hidden="true" onClick={remove} type="button">
    <CloseIcon />
  </button>
);

// E61 (B02, fixes: no): add aria-label="button"
export const E61 = () => (
  <button aria-label="button" onClick={remove} type="button">
    <CloseIcon />
  </button>
);

// E62 (B04, fixes: no): add aria-hidden to the svg only
export const E62 = () => (
  <button onClick={remove} type="button">
    <svg aria-hidden="true" viewBox="0 0 16 16">
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
  </button>
);

// E63 (B04, fixes: yes): add aria-hidden to the svg and an sr-only text label
export const E63 = () => (
  <button onClick={remove} type="button">
    <svg aria-hidden="true" viewBox="0 0 16 16">
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
    <span className="sr-only">Close</span>
  </button>
);

// E64 (B04, fixes: no): add a <title> to the svg that says "icon"
export const E64 = () => (
  <button onClick={remove} type="button">
    <svg viewBox="0 0 16 16">
      <title>icon</title>
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
  </button>
);

// O01: iframe with no title
export const O01 = () => <iframe src="https://example.com/embed" />;

// O02: empty heading
export const O02 = () => <h2 />;

// O03: heading with dynamic content
export const O03 = () => <h2>{title}</h2>;

// O04: heading whose only content is aria-hidden
export const O04 = () => (
  <h2>
    <span aria-hidden="true">★</span>
  </h2>
);

// O05: html without lang
export const O05 = () => (
  <html>
    <body />
  </html>
);

// O06: html with an invalid lang
export const O06 = () => (
  <html lang="english">
    <body />
  </html>
);

// O07: video without captions
export const O07 = () => <video src="/talk.mp4" />;

// O08: marquee
export const O08 = () => <marquee>News</marquee>;

// O09: scope on a td
export const O09 = () => (
  <table>
    <tbody>
      <tr>
        <td scope="row">A</td>
      </tr>
    </tbody>
  </table>
);

// O10: table without headers
export const O10 = () => (
  <table>
    <tbody>
      <tr>
        <td>A</td>
        <td>B</td>
      </tr>
    </tbody>
  </table>
);

// O11: role="dialog" with no accessible name
export const O11 = () => <div role="dialog">Settings</div>;

// O12: outline: none in an inline style
export const O12 = () => (
  <button style={{ outline: "none" }} type="button">
    Save
  </button>
);

// O13: object with no alternative content
export const O13 = () => <object data="/report.pdf" />;

// O14: mouse-only hover reveal with onMouseEnter and no onFocus on a button
export const O14 = () => (
  <button onMouseEnter={open} type="button">
    Info
  </button>
);

// O15: role="button" handling Enter only (react-doctor's complete-activation rule)
export const O15 = () => (
  <div onClick={open} onKeyDown={onEnterOnly} role="button" tabIndex={0}>
    Open
  </div>
);
// END
