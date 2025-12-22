import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CallToAction } from "../../components/cta";
import { Footer } from "../../components/footer";
import { Installer } from "../../components/installer";
import { editors, getEditorById } from "../data";

interface EditorPageProps {
  params: Promise<{
    editor: string;
  }>;
}

export const generateStaticParams = () =>
  editors.map((editor) => ({ editor: editor.id }));

export const generateMetadata = async ({
  params,
}: EditorPageProps): Promise<Metadata> => {
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

const EditorPage = async ({ params }: EditorPageProps) => {
  const { editor: editorId } = await params;
  const editor = getEditorById(editorId);

  if (!editor) {
    notFound();
  }

  return (
    <>
      <div className="grid gap-8 sm:gap-20">
        <div className="grid gap-4">
          <div className="flex items-center gap-2">
            <span className="rounded-full border bg-muted/50 px-3 py-1 text-xs">
              Editor Configuration
            </span>
          </div>
          <h1 className="mb-0 max-w-xl text-balance font-semibold text-3xl leading-none tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl">
            {editor.name}
          </h1>
          <p className="max-w-xl text-balance text-lg text-muted-foreground tracking-tight">
            {editor.description}
          </p>
          <div className="flex w-full max-w-lg flex-col items-center gap-2 sm:flex-row">
            <Installer
              command={`npx ultracite@latest init --editors ${editor.cliValue}`}
            />
            <Button
              className="px-4"
              nativeButton={false}
              render={
                <a
                  href={editor.website}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Visit {editor.name}
                </a>
              }
              size="lg"
              variant="link"
            />
          </div>
        </div>

        <div className="grid gap-16">
          <section className="grid gap-8">
            <div className="grid gap-4">
              <h2 className="font-semibold text-2xl tracking-tight">
                Key features
              </h2>
              <p className="max-w-2xl text-muted-foreground">
                What makes {editor.name} great for development with Ultracite.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {editor.features.map((feature) => (
                <div className="rounded-lg border p-6" key={feature}>
                  <p className="font-medium">{feature}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-8">
            <div className="grid gap-4">
              <h2 className="font-semibold text-2xl tracking-tight">
                Configuration
              </h2>
              <p className="max-w-2xl text-muted-foreground">
                Ultracite automatically creates and manages the settings file
                for {editor.name}.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border p-4">
                <p className="font-medium text-sm">Settings file</p>
                <code className="mt-1 block text-muted-foreground text-sm">
                  {editor.configPath}
                </code>
              </div>
              <div className="rounded-lg border p-4">
                <p className="font-medium text-sm">CLI flag</p>
                <code className="mt-1 block text-muted-foreground text-sm">
                  --editors {editor.cliValue}
                </code>
              </div>
            </div>
          </section>

          <section className="grid gap-8">
            <div className="grid gap-4">
              <h2 className="font-semibold text-2xl tracking-tight">
                What Ultracite configures
              </h2>
              <p className="max-w-2xl text-muted-foreground">
                Ultracite sets up {editor.name} with optimal settings for your
                chosen linter.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-lg border p-6">
                <h3 className="mb-2 font-medium">Format on save</h3>
                <p className="text-muted-foreground text-sm">
                  Automatically formats your code when you save, keeping it
                  clean and consistent.
                </p>
              </div>
              <div className="rounded-lg border p-6">
                <h3 className="mb-2 font-medium">Default formatter</h3>
                <p className="text-muted-foreground text-sm">
                  Sets up the correct formatter extension for each file type
                  based on your linter choice.
                </p>
              </div>
              <div className="rounded-lg border p-6">
                <h3 className="mb-2 font-medium">Auto-fix on save</h3>
                <p className="text-muted-foreground text-sm">
                  Enables code actions on save to automatically fix linting
                  issues and organize imports.
                </p>
              </div>
              <div className="rounded-lg border p-6">
                <h3 className="mb-2 font-medium">TypeScript SDK</h3>
                <p className="text-muted-foreground text-sm">
                  Configures the workspace TypeScript version for consistent
                  type checking.
                </p>
              </div>
              <div className="rounded-lg border p-6">
                <h3 className="mb-2 font-medium">Extension installation</h3>
                <p className="text-muted-foreground text-sm">
                  Automatically installs the required linter extension when
                  creating a new configuration.
                </p>
              </div>
              <div className="rounded-lg border p-6">
                <h3 className="mb-2 font-medium">Format on paste</h3>
                <p className="text-muted-foreground text-sm">
                  Formats pasted code to match your project's style
                  automatically.
                </p>
              </div>
            </div>
          </section>

          <section className="grid gap-8">
            <div className="grid gap-4">
              <h2 className="font-semibold text-2xl tracking-tight">
                How it works
              </h2>
              <p className="max-w-2xl text-muted-foreground">
                Ultracite configures {editor.name} to work seamlessly with your
                chosen linter.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border p-6">
                <div className="mb-2 flex size-8 items-center justify-center rounded-full bg-muted font-medium text-sm">
                  1
                </div>
                <h3 className="mb-2 font-medium">Initialize</h3>
                <p className="text-muted-foreground text-sm">
                  Run the init command with the --editors flag to set up{" "}
                  {editor.name} support.
                </p>
              </div>
              <div className="rounded-lg border p-6">
                <div className="mb-2 flex size-8 items-center justify-center rounded-full bg-muted font-medium text-sm">
                  2
                </div>
                <h3 className="mb-2 font-medium">Configure</h3>
                <p className="text-muted-foreground text-sm">
                  Ultracite creates{" "}
                  <code className="text-xs">{editor.configPath}</code> with
                  optimal settings.
                </p>
              </div>
              <div className="rounded-lg border p-6">
                <div className="mb-2 flex size-8 items-center justify-center rounded-full bg-muted font-medium text-sm">
                  3
                </div>
                <h3 className="mb-2 font-medium">Code</h3>
                <p className="text-muted-foreground text-sm">
                  {editor.name} now automatically formats and fixes your code on
                  save.
                </p>
              </div>
            </div>
          </section>

          <section className="grid gap-8">
            <div className="grid gap-4">
              <h2 className="font-semibold text-2xl tracking-tight">
                Other editors
              </h2>
              <p className="max-w-2xl text-muted-foreground">
                Ultracite supports {editors.length} code editors. Here are some
                others you might be interested in.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {editors
                .filter((e) => e.id !== editor.id)
                .map((otherEditor) => (
                  <Link
                    className="rounded-lg border p-4 transition-colors hover:bg-muted/50"
                    href={`/editors/${otherEditor.id}`}
                    key={otherEditor.id}
                  >
                    <p className="font-medium text-sm">{otherEditor.name}</p>
                    <p className="mt-1 line-clamp-2 text-muted-foreground text-xs">
                      {otherEditor.description}
                    </p>
                  </Link>
                ))}
            </div>
          </section>
        </div>
      </div>

      <CallToAction />
      <Footer />
    </>
  );
};

export default EditorPage;
