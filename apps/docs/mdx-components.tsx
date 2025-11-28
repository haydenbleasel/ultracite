import DynamicLink from "fumadocs-core/dynamic-link";
import { Tab, Tabs } from "fumadocs-ui/components/tabs";
import defaultMdxComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";
import type { ComponentProps } from "react";

// use this function to get MDX components, you will need it for rendering MDX
export function getMDXComponents(
  lang: string,
  components?: MDXComponents
): MDXComponents {
  return {
    ...defaultMdxComponents,
    Tab,
    Tabs,
    ...components,

    a: ({ href, ...props }: ComponentProps<typeof DynamicLink>) =>
      href?.startsWith("/") ? (
        <DynamicLink {...props} href={`/${lang}${href as string}`} />
      ) : (
        <a {...props} href={href} />
      ),
  };
}
