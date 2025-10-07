import { DocsLayout } from "fumadocs-ui/layouts/notebook";
import type { ReactNode } from "react";
import { ConditionalContainer } from "@/components/conditional-container";
import { baseOptions } from "@/lib/layout.config";
import { source } from "@/lib/source";

type DocsLayoutProps = {
  children: ReactNode;
};

const DocLayout = async (props: DocsLayoutProps) => (
  <ConditionalContainer>
    <DocsLayout
      {...baseOptions}
      nav={{
        ...baseOptions.nav,
        mode: "top",
      }}
      sidebar={{ collapsible: false, tabs: false }}
      tree={source.pageTree}
    >
      {props.children}
    </DocsLayout>
  </ConditionalContainer>
);

export default DocLayout;
