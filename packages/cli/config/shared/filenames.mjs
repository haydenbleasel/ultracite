// Preserve eslint-plugin-github's current default filename convention for
// ordinary files, while making its filename regex understand TanStack Router's
// documented file-route syntax when a routing token is present.
const githubDefaultFilename = String.raw`[a-z0-9-]+(?:.[a-z0-9-]+)?`;

// TanStack literal path text plus `[x]` escapes for routing metacharacters.
const tanstackLiteralAtom = String.raw`(?:[A-Za-z0-9-]|\[[^\[\]]+\])`;
const tanstackLiteralSegment = String.raw`${tanstackLiteralAtom}+`;

// Braced params cover required prefix/suffix patterns (`{$id}`) and optional
// params (`{-$id}`). They can be mixed with literal/escaped text in a segment.
const tanstackParamAtom = String.raw`(?:\{\$[A-Za-z0-9_-]+\}|\{-\$[A-Za-z0-9_-]+\})`;
const tanstackPatternSegment = String.raw`(?:${tanstackLiteralAtom}|${tanstackParamAtom})+`;

// A segment is pathless (`_layout`), dynamic/splat (`$id` / `$`), or a normal
// literal/pattern segment. A trailing `_` opts the segment out of nesting.
const tanstackRouteSegment = String.raw`(?:(?:_${tanstackLiteralSegment}|\$(?:${tanstackLiteralSegment})?|${tanstackPatternSegment})_?)`;
const tanstackRouteFilename = String.raw`(?:__root|-?${tanstackRouteSegment}(?:\.${tanstackRouteSegment})*)`;
const tanstackRoutingMarker = String.raw`[$_.\[\]{}]`;

export const githubFilenameRegex = String.raw`^(?:(?!.*${tanstackRoutingMarker})${githubDefaultFilename}|(?=.*${tanstackRoutingMarker})${tanstackRouteFilename})$`;
