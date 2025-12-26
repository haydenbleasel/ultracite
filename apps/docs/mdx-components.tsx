import { TypeTable } from "fumadocs-ui/components/type-table";
import defaultMdxComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";
import {
  Callout,
  CalloutContainer,
  CalloutDescription,
  CalloutTitle,
} from "@/components/fumadocs/callout";
import { CodeBlock } from "@/components/fumadocs/code-block";
import {
  CodeBlockTab,
  CodeBlockTabs,
  CodeBlockTabsList,
  CodeBlockTabsTrigger,
} from "@/components/fumadocs/code-block-tabs";
import { Mermaid } from "@/components/fumadocs/mermaid";
import { Video } from "@/components/fumadocs/video";

// use this function to get MDX components, you will need it for rendering MDX
export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultMdxComponents,
    ...components,

    pre: CodeBlock,

    CodeBlockTabs,
    CodeBlockTabsList,
    CodeBlockTabsTrigger,
    CodeBlockTab,

    TypeTable,

    Callout,
    CalloutContainer,
    CalloutTitle,
    CalloutDescription,

    Mermaid,

    Video,
  };
}
