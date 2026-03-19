import { agents } from "@repo/data/agents";
import { docsUrl, webUrl } from "@repo/data/consts";
import { editors } from "@repo/data/editors";
import { providers } from "@repo/data/providers";

import { NavbarClient } from "./navbar-client";

export const Navbar = () => (
  <NavbarClient
    agents={agents.map((a) => ({
      id: a.id,
      logo: a.logo,
      name: a.name,
      subtitle: a.subtitle,
    }))}
    docsUrl={docsUrl}
    editors={editors.map((e) => ({
      id: e.id,
      logo: e.logo,
      name: e.name,
      subtitle: e.subtitle,
    }))}
    providers={providers.map((p) => ({
      id: p.id,
      logo: p.logo,
      name: p.name,
      subtitle: p.subtitle,
    }))}
    webUrl={webUrl}
  />
);
