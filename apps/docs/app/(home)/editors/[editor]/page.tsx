import { editors, getEditorById } from "@ultracite/data/editors";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CallToAction } from "../../components/cta";
import { Footer } from "../../components/footer";
import { Logos } from "../../components/logos";
import { Social } from "../../components/social";
import { Benefits } from "./components/benefits";
import { Config } from "./components/config";
import { EditorHero } from "./components/hero";

export const generateStaticParams = () =>
  editors.map((editor) => ({ editor: editor.id }));

export const generateMetadata = async ({
  params,
}: PageProps<"/editors/[editor]">): Promise<Metadata> => {
  const { editor: editorId } = await params;
  const editor = getEditorById(editorId);

  if (!editor) {
    return {
      title: "Editor Not Found | Ultracite",
    };
  }

  return {
    title: `${editor.name} | Ultracite`,
    description: editor.description,
  };
};

const EditorPage = async ({ params }: PageProps<"/editors/[editor]">) => {
  const { editor: editorId } = await params;
  const editor = getEditorById(editorId);

  if (!editor) {
    notFound();
  }

  return (
    <div className="grid gap-16 sm:gap-24 md:gap-32">
      <EditorHero editor={editor} />
      <Config editor={editor} />
      <Benefits editor={editor} />
      <Logos />
      <Social />
      <CallToAction />
      <Footer />
    </div>
  );
};

export default EditorPage;
