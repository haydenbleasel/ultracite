import { DocsLayout } from "fumadocs-ui/layouts/notebook";
import type { Metadata } from "next";
import { baseOptions } from "@/lib/layout.config";
import { source } from "@/lib/source";

export const metadata: Metadata = {
  title: {
    template: "%s | Ultracite",
    default: "Ultracite",
  },
};

const DocLayout = async (props: LayoutProps<"/[lang]/[...slug]">) => {
  const { lang } = await props.params;

  return (
    <DocsLayout
      {...baseOptions}
      nav={{
        ...baseOptions.nav,
        mode: "top",
      }}
      sidebar={{ collapsible: false }}
      tabMode="navbar"
      tree={source.pageTree[lang]}
    >
      {props.children}
    </DocsLayout>
  );
};

export default DocLayout;
