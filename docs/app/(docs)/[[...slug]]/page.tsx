import { DocsLayout } from "fumadocs-ui/layouts/notebook";
import { createRelativeLink } from "fumadocs-ui/mdx";
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from "fumadocs-ui/page";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { baseOptions } from "@/lib/layout.config";
import { source } from "@/lib/source";
import { getMDXComponents } from "@/mdx-components";
import Home from "./(home)";
import { LLMCopyButton, ViewOptions } from "@/components/page-actions";

type PageProps = {
  params: Promise<{ slug?: string[] }>;
};

const Page = async (props: PageProps) => {
  const params = await props.params;
  const page = source.getPage(params.slug);

  if (!params.slug) {
    return (
      <DocsLayout
        {...baseOptions}
        containerProps={{ className: "home" }}
        nav={{ ...baseOptions.nav, mode: "top" }}
        sidebar={{ hidden: false, collapsible: false }}
        tree={source.pageTree}
      >
        <Home />
      </DocsLayout>
    );
  }

  if (!page) {
    return notFound();
  }

  const MDXContent = page.data.body;

  return (
    <DocsLayout
      {...baseOptions}
      nav={{
        ...baseOptions.nav,
        mode: "top",
      }}
      sidebar={{ collapsible: false, tabs: false }}
      tree={source.pageTree}
    >
      <DocsPage full={page.data.full} toc={page.data.toc}>
        <DocsTitle>{page.data.title}</DocsTitle>
        <DocsDescription>{page.data.description}</DocsDescription>
        <div className="flex flex-row gap-2 items-center -mt-6 mb-6">
          <LLMCopyButton markdownUrl={`${page.url}.mdx`} />
          <ViewOptions
            markdownUrl={`${page.url}.mdx`}
            githubUrl={`https://github.com/haydenbleasel/ultracite/blob/main/docs/content/${page.path}`}
          />
        </div>
        <DocsBody>
          <MDXContent
            components={getMDXComponents({
              // this allows you to link to other pages with relative file paths
              a: createRelativeLink(source, page),
            })}
          />
        </DocsBody>
      </DocsPage>
    </DocsLayout>
  );
};

export const generateStaticParams = () => source.generateParams();

export const generateMetadata = async (props: PageProps): Promise<Metadata> => {
  const params = await props.params;
  const page = source.getPage(params.slug);

  if (!params.slug) {
    return {
      title:
        "The AI-ready formatter that helps you write and generate code faster. | Ultracite",
      description:
        "Ultracite is a zero- config Biome preset that provides a robust linting and formatting experience for your team and your AI integrations.",
    };
  }

  if (!page) {
    return {};
  }

  const image = ["/og", ...(params.slug || []), "image.png"].join("/");

  return {
    title: page.data.title,
    description: page.data.description,
    openGraph: {
      title: page.data.title,
      description: page.data.description,
      images: image,
    },
    twitter: {
      title: page.data.title,
      description: page.data.description,
      creator: "@haydenbleasel",
      card: "summary_large_image",
      images: image,
    },
  };
};

export default Page;
