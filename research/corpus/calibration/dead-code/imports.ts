// Calibration cases for unused and duplicate imports. Each case starts with a `// ID: description`
// line; every diagnostic up to the next header belongs to it.

// I01: an unused named import
import { readThing } from "./more";
// I02: an import used only as a type (plain `import`, not `import type`)
import { Config } from "./types";
// I03: an unused `import type`
import type { Config as UnusedConfig } from "./types";
// I04: one unused specifier next to a used one
import { DEFAULT_NAME, helper } from "./helpers";
// I05: a duplicate import of the same module (second statement)
import { other } from "./helpers";
// I06: an unused namespace import
import * as extras from "./extra";
// I07: a side-effect import (nothing to be unused)
import "./side";
// I09: an unused import whose name starts with `_`
import { _internalHelper } from "./under";

// I08: the uses
export const describe = (config: Config): string => helper(config.name);
export const shout = (value: string): string => other(value);

// END
