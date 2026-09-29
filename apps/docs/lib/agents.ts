// The homepage lists exactly the agents `ultracite init` supports, so it reads
// the CLI's own table (at build time) instead of keeping a copy that drifts.
import { agents as cliAgents } from "../../../packages/cli/src/data/agents";

export interface Agent {
  id: string;
  name: string;
}

export const agents: Agent[] = cliAgents.map(({ id, name }) => ({ id, name }));
