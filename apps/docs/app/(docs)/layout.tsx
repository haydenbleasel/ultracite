import { DocsLayout } from "fumadocs-ui/layouts/notebook";
import type { Metadata } from "next";
import { ConditionalContainer } from "@/components/conditional-container";
import { baseOptions } from "@/lib/layout.config";
import { source } from "@/lib/source";

export const metadata: Metadata = {
  title: {
    template: "%s | Ultracite",
    default: "Ultracite",
  },
};

const DocLayout = async (props: LayoutProps<"/">) => (
  <ConditionalContainer>
    <DocsLayout
      {...baseOptions}
      nav={{
        ...baseOptions.nav,
        mode: "top",
      }}
      sidebar={{ collapsible: false }}
      tabMode="navbar"
      tree={source.pageTree}
    >
      {props.children}
    </DocsLayout>
  </ConditionalContainer>
);

export default DocLayout;
