import { editors } from "@repo/data/editors";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { JsonLd } from "@/components/seo/json-ld";
import { Logos } from "@/components/ultracite/logos";
import { Social } from "@/components/ultracite/social";
import {
  createBreadcrumbStructuredData,
  createPageMetadata,
} from "@/lib/site-metadata";

import { Benefits } from "./components/benefits";
import { Config } from "./components/config";
import { EditorHero } from "./components/hero";

export const generateStaticParams = () =>
  editors.map((editor) => ({ editor: editor.id }));

export const generateMetadata = async ({
  params,
}: PageProps<"/editors/[editor]">): Promise<Metadata> => {
  const { editor: editorId } = await params;
  const editor = editors.find((e) => e.id === editorId);

  if (!editor) {
    return {};
  }

  return createPageMetadata({
    description: `Configure ${editor.name} to use Ultracite for format on save, auto-fixes, and consistent linting. ${editor.description}`,
    path: `/editors/${editor.id}`,
    title: `Ultracite for ${editor.name}`,
  });
};

const EditorPage = async ({ params }: PageProps<"/editors/[editor]">) => {
  const { editor: editorId } = await params;
  const editor = editors.find((e) => e.id === editorId);

  if (!editor) {
    notFound();
  }

  return (
    <>
      <JsonLd
        data={createBreadcrumbStructuredData([
          { name: "Home", path: "/" },
          { name: editor.name, path: `/editors/${editor.id}` },
        ])}
      />
      <div className="grid gap-16 sm:gap-24 md:gap-32">
        <EditorHero editor={editor} />
        <Config editor={editor} />
        <Benefits editor={editor} />
        <Logos />
        <Social />
      </div>
    </>
  );
};

export default EditorPage;
