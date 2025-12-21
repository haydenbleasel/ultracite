import { DocsLayout } from "fumadocs-ui/layouts/notebook";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { baseOptions } from "@/lib/layout";
import { source } from "@/lib/source";

export const metadata: Metadata = {
  title: {
    template: "%s | Ultracite",
    default: "Ultracite",
  },
};

type DocLayoutProps = {
  children: ReactNode;
};

const DocLayout = ({ children }: DocLayoutProps) => {
  return (
    <DocsLayout
      {...baseOptions()}
      nav={{ ...baseOptions().nav, mode: "top" }}
      tabMode="navbar"
      tree={source.pageTree}
    >
      {children}
    </DocsLayout>
  );
};

export default DocLayout;
