import { agentIds } from "@ultracite/data/agents";
import { editorCliValues } from "@ultracite/data/editors";
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
  editorConfigs: editorCliValues,
  agents: agentIds,
  integrations,
  hooks,
  frameworks,
  migrations,
};
