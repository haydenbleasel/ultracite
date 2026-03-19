import { agents } from "@repo/data/agents";
import { docsUrl } from "@repo/data/consts";
import { editors } from "@repo/data/editors";
import { providers } from "@repo/data/providers";
import { Suspense } from "react";

import { NavbarClient } from "./navbar-client";

export const Navbar = () => (
  <Suspense>
    <NavbarClient
      agents={agents.map((a) => ({
        href: `/agents/${a.id}`,
        id: a.id,
        logo: a.logo,
        name: a.name,
        subtitle: a.subtitle,
      }))}
      docsUrl={docsUrl}
      editors={editors.map((e) => ({
        href: `/editors/${e.id}`,
        id: e.id,
        logo: e.logo,
        name: e.name,
        subtitle: e.subtitle,
      }))}
      providers={providers.map((p) => ({
        href: `/providers/${p.id}`,
        id: p.id,
        logo: p.logo,
        name: p.name,
        subtitle: p.subtitle,
      }))}
    />
  </Suspense>
);
