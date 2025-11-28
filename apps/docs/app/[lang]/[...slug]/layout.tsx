import { DocsLayout } from "fumadocs-ui/layouts/notebook";
import type { Metadata } from "next";
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
      containerProps={{
        className: "pt-[40px]",
      }}
      nav={{ enabled: false, mode: "top" }}
      sidebar={{ collapsible: false }}
      tabMode="navbar"
      tree={source.pageTree[lang]}
    >
      {props.children}
    </DocsLayout>
  );
};

export default DocLayout;
