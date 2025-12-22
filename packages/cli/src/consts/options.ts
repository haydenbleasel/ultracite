import {
  agentIds,
  editorCliValues,
  frameworks,
  hooks,
  integrations,
  migrations,
  providerIds,
} from "@ultracite/data";
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
