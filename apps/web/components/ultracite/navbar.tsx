import { agents } from "@repo/data/agents";
import { docsUrl, webUrl } from "@repo/data/consts";
import { editors } from "@repo/data/editors";
import { providers } from "@repo/data/providers";
import { Suspense } from "react";

import { NavbarClient } from "./navbar-client";

export const Navbar = () => (
  <Suspense>
    <NavbarClient
      agents={agents.map((a) => ({
        href: new URL(`/agents/${a.id}`, webUrl).toString(),
        id: a.id,
        logo: a.logo,
        name: a.name,
        subtitle: a.subtitle,
      }))}
      docsUrl={docsUrl}
      editors={editors.map((e) => ({
        href: new URL(`/editors/${e.id}`, webUrl).toString(),
        id: e.id,
        logo: e.logo,
        name: e.name,
        subtitle: e.subtitle,
      }))}
      providers={providers.map((p) => ({
        href: new URL(`/providers/${p.id}`, webUrl).toString(),
        id: p.id,
        logo: p.logo,
        name: p.name,
        subtitle: p.subtitle,
      }))}
    />
  </Suspense>
);
