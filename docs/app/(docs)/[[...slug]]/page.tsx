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
				tree={source.pageTree}
				sidebar={{ hidden: false, collapsible: false }}
				nav={{ ...baseOptions.nav, mode: "top" }}
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
			tree={source.pageTree}
			sidebar={{ collapsible: false, tabs: false }}
			nav={{
				...baseOptions.nav,
				mode: "top",
			}}
		>
			<DocsPage toc={page.data.toc} full={page.data.full}>
				<DocsTitle>{page.data.title}</DocsTitle>
				<DocsDescription>{page.data.description}</DocsDescription>
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
			title: "Ultracite",
			description:
				"Ultracite is a fast, intuitive and simple development tool that brings automated code formatting and linting to your JavaScript / TypeScript projects.",
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
