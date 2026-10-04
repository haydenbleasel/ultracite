// Editors and agents that `ultracite init` can install a fix-on-edit hook for,
// read from the CLI's own table (at build time) so homepage copy stays true.
import { hooks as cliHooks } from "../../../packages/cli/src/data/hooks";

export interface HookIntegration {
  id: string;
  name: string;
}

export const hookIntegrations: HookIntegration[] = cliHooks.map(
  ({ id, name }) => ({ id, name })
);
