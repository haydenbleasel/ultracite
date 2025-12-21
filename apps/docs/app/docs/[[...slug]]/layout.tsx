import { DocsLayout } from "fumadocs-ui/layouts/notebook";
import type { Metadata } from "next";
import { Logo } from "@/app/(home)/components/logo";
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
    links={[
      { url: "/", text: "Home", active: "url" },
      { url: "/introduction", text: "Docs", active: "nested-url" },
      { url: "/social", text: "Social", active: "url" },
    ]}
    nav={{
      title: (
        <span className="flex items-center gap-2">
          <Logo className="size-4" />
          <span className="font-semibold text-lg tracking-tight">
            Ultracite
          </span>
        </span>
      ),
      url: "/",
      mode: "top",
    }}
    tabMode="navbar"
    themeSwitch={{
      mode: "light-dark-system",
    }}
    tree={source.pageTree}
  >
    {children}
  </DocsLayout>
);

export default DocLayout;
