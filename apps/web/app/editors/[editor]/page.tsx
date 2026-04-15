import { editors, getEditorById, getEditorPageData } from "@repo/data/editors";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { JsonLd } from "@/components/seo/json-ld";
import { FaqSection } from "@/components/ultracite/faq-section";
import { Logos } from "@/components/ultracite/logos";
import { Social } from "@/components/ultracite/social";
import {
  createBreadcrumbStructuredData,
  createFaqStructuredData,
  createPageMetadata,
} from "@/lib/site-metadata";

import { Benefits } from "./components/benefits";
import { EditorHero } from "./components/hero";
import { RelatedEditors } from "./components/related-editors";
import { SetupFiles } from "./components/setup-files";
import { Workflow } from "./components/workflow";

export const generateStaticParams = () =>
  editors.map((editor) => ({ editor: editor.id }));

export const generateMetadata = async ({
  params,
}: PageProps<"/editors/[editor]">): Promise<Metadata> => {
  const { editor: editorId } = await params;
  const editor = getEditorById(editorId);

  if (!editor) {
    return {};
  }

  const pageData = getEditorPageData(editor);

  return createPageMetadata({
    description: pageData.metaDescription,
    path: `/editors/${editor.id}`,
    title: pageData.title,
  });
};

const EditorPage = async ({ params }: PageProps<"/editors/[editor]">) => {
  const { editor: editorId } = await params;
  const editor = getEditorById(editorId);

  if (!editor) {
    notFound();
  }

  const pageData = getEditorPageData(editor);

  return (
    <>
      <JsonLd
        data={createBreadcrumbStructuredData([
          { name: "Home", path: "/" },
          { name: editor.name, path: `/editors/${editor.id}` },
        ])}
      />
      {editor.faq.length > 0 && (
        <JsonLd data={createFaqStructuredData(editor.faq)} />
      )}
      <div className="grid gap-16 sm:gap-24 md:gap-32">
        <EditorHero editor={editor} />
        <SetupFiles editorName={editor.name} setupFiles={pageData.setupFiles} />
        <Benefits editor={editor} />
        <Workflow editor={editor} />
        <FaqSection
          description={`Editor-specific answers for teams rolling out Ultracite in ${editor.name}.`}
          items={editor.faq}
          title={`${editor.name} FAQ`}
        />
        <RelatedEditors
          editor={editor}
          relatedEditors={pageData.relatedEditors}
        />
        <Logos />
        <Social />
      </div>
    </>
  );
};

export default EditorPage;
