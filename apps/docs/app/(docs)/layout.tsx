import { DocsLayout } from "fumadocs-ui/layouts/notebook";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ConditionalContainer } from "@/components/conditional-container";
import { baseOptions } from "@/lib/layout.config";
import { source } from "@/lib/source";

type DocsLayoutProps = {
  children: ReactNode;
};

export const metadata: Metadata = {
  title: {
    template: "%s | Ultracite",
    default: "Ultracite",
  },
};

const DocLayout = async (props: DocsLayoutProps) => (
  <ConditionalContainer>
    <DocsLayout
      {...baseOptions}
      nav={{
        ...baseOptions.nav,
        mode: "top",
      }}
      sidebar={{
        collapsible: false,
        tabs: [
          {
            title: "Overview",
            url: "/introduction",
          },
          {
            title: "Presets",
            url: "/preset/core",
          },
          {
            title: "Integrations",
            url: "/integration/husky",
          },
          {
            title: "Migrations",
            url: "/migrate/eslint",
          },
          {
            title: "Upgrade",
            url: "/upgrade/v6",
          },
        ],
      }}
      tabMode="navbar"
      tree={source.pageTree}
    >
      {props.children}
    </DocsLayout>
  </ConditionalContainer>
);

export default DocLayout;
