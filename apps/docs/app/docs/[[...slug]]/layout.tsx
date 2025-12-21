import { DocsLayout } from "fumadocs-ui/layouts/notebook";
import type { Metadata } from "next";
import { source } from "@/lib/source";
import { Logo } from "@/app/(home)/components/logo";

export const metadata: Metadata = {
  title: {
    template: "%s | Ultracite",
    default: "Ultracite",
  },
};

const DocLayout = ({ children }: LayoutProps<"/docs/[[...slug]]">) => (
  <DocsLayout
    nav={{
      title: (
        <span className="flex items-center gap-2">
          <Logo className="size-4" />
          <span className="font-semibold text-lg tracking-tight">Ultracite</span>
        </span>
      ),
      url: "/",
      mode: "top",
    }}
    links={[
      { url: "/", text: "Home", active: "url" },
      { url: "/introduction", text: "Docs", active: "nested-url" },
      { url: "/social", text: "Social", active: "url" },
    ]}
    githubUrl="https://github.com/haydenbleasel/ultracite"
    themeSwitch={{
      mode: "light-dark-system",
    }}
    tabMode="navbar"
    tree={source.pageTree}
  >
    {children}
  </DocsLayout>
);

export default DocLayout;
