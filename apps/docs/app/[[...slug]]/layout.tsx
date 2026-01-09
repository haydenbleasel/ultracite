import { DocsLayout } from "fumadocs-ui/layouts/docs";
import type { Metadata } from "next";

import { source } from "@/lib/source";

export const metadata: Metadata = {
  title: {
    default: "Ultracite",
    template: "%s | Ultracite",
  },
};

const DocLayout = ({ children }: LayoutProps<"/[[...slug]]">) => (
  <DocsLayout
    containerProps={{
      className: "transition-none!",
    }}
    githubUrl="https://github.com/haydenbleasel/ultracite"
    nav={{
      enabled: false,
    }}
    sidebar={{
      className: "bg-background! xl:border-none!",
      collapsible: false,
    }}
    themeSwitch={{
      enabled: false,
    }}
    tree={source.pageTree}
  >
    {children}
  </DocsLayout>
);

export default DocLayout;
