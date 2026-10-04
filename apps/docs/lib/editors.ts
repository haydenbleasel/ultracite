// The homepage lists exactly the editors `ultracite init` configures, so it
// reads the CLI's own table (at build time) instead of keeping a copy that
// drifts.
import { editors as cliEditors } from "../../../packages/cli/src/data/editors";

export interface Editor {
  id: string;
  name: string;
}

export const editors: Editor[] = cliEditors.map(({ id, name }) => ({
  id,
  name,
}));
