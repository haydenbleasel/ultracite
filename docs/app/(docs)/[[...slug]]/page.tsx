import { createRelativeLink } from "fumadocs-ui/mdx";
import {
	DocsBody,
	DocsDescription,
	DocsPage,
	DocsTitle,
} from "fumadocs-ui/page";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { source } from "@/lib/source";
import { getMDXComponents } from "@/mdx-components";

type PageProps = {
	params: Promise<{ slug?: string[] }>;
};

const Page = async (props: PageProps) => {
	const params = await props.params;
	const page = source.getPage(params.slug);

	if (!page) {
		return notFound();
	}

	const MDXContent = page.data.body;

	return (
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
	);
};

export const generateStaticParams = () => source.generateParams();

export const generateMetadata = async (props: PageProps): Promise<Metadata> => {
	const params = await props.params;
	const page = source.getPage(params.slug);

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
