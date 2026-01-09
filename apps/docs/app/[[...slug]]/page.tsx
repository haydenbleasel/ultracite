import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from "fumadocs-ui/layouts/docs/page";
import { createRelativeLink } from "fumadocs-ui/mdx";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CopyMarkdown } from "@/components/ultracite/copy-markdown";
import { Feedback } from "@/components/ultracite/feedback";
import { MobileSidebarTrigger } from "@/components/ultracite/mobile-sidebar-trigger";
import { ViewOptions } from "@/components/ultracite/page-actions";
import { getLLMText, source } from "@/lib/source";
import { getMDXComponents } from "@/mdx-components";

const Page = async (props: PageProps<"/[[...slug]]">) => {
  const { slug } = await props.params;
  const page = source.getPage(slug);

  if (!page) {
    return notFound();
  }

  const MdxContent = page.data.body;
  const markdown = await getLLMText(page);

  return (
    <DocsPage full={page.data.full} toc={page.data.toc}>
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <div className="-mt-6 mb-6 flex flex-row items-center gap-2">
        <CopyMarkdown markdown={markdown} />
        <ViewOptions
          githubUrl={`https://github.com/haydenbleasel/ultracite/blob/main/apps/docs/content/docs/${page.path}`}
          markdownUrl={`${page.url}.mdx`}
        />
      </div>
      <DocsBody>
        <MdxContent
          components={getMDXComponents({
            // this allows you to link to other pages with relative file paths
            a: createRelativeLink(source, page),
          })}
        />
      </DocsBody>
      <Feedback className="mt-12" />
      <MobileSidebarTrigger />
    </DocsPage>
  );
};

export const generateStaticParams = () => source.generateParams();

export const generateMetadata = async (
  props: PageProps<"/[[...slug]]">
): Promise<Metadata> => {
  const { slug } = await props.params;
  const page = source.getPage(slug);

  if (!page) {
    return {};
  }

  const image = ["/og", ...(slug ?? []), "image.png"].join("/");

  return {
    description: page.data.description,
    openGraph: {
      description: page.data.description,
      images: image,
      title: page.data.title,
    },
    title: page.data.title,
    twitter: {
      card: "summary_large_image",
      creator: "@haydenbleasel",
      description: page.data.description,
      images: image,
      title: page.data.title,
    },
  };
};

export default Page;
