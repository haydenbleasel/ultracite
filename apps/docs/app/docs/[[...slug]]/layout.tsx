import { DocsLayout } from "fumadocs-ui/layouts/docs";
import type { Metadata } from "next";
import { source } from "@/lib/source";

export const metadata: Metadata = {
  title: {
    template: "%s | Ultracite",
    default: "Ultracite",
  },
};

const DocLayout = ({ children }: LayoutProps<"/docs/[[...slug]]">) => (
  <DocsLayout
    githubUrl="https://github.com/haydenbleasel/ultracite"
    nav={{
      enabled: false,
    }}
    sidebar={{
      collapsible: false,
      className: "bg-background!",
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
