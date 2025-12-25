import { agentIds } from "@ultracite/data/agents";
import { editorIds } from "@ultracite/data/editors";
import {
  frameworks,
  hooks,
  integrations,
  migrations,
} from "@ultracite/data/options";
import { providerIds } from "@ultracite/data/providers";
import { type PackageManagerName, packageManagers } from "nypm";

export const options = {
  packageManagers: packageManagers.map((pm) => pm.name) as PackageManagerName[],
  linters: providerIds,
  editorConfigs: editorIds,
  agents: agentIds,
  integrations,
  hooks,
  frameworks,
  migrations,
};
