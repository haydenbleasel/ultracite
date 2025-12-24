import { agents, categoryLabels, getAgentById } from "@ultracite/data";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CallToAction } from "../../components/cta";
import { Footer } from "../../components/footer";
import { Installer } from "../../components/installer";

export const generateStaticParams = () =>
  agents.map((agent) => ({ agent: agent.id }));

export const generateMetadata = async ({
  params,
}: PageProps<"/agents/[agent]">): Promise<Metadata> => {
  const { agent: agentId } = await params;
  const agent = getAgentById(agentId);

  if (!agent) {
    return {
      title: "Agent Not Found | Ultracite",
    };
  }

  return {
    title: `${agent.name} | Ultracite`,
    description: agent.description,
  };
};

const AgentPage = async ({ params }: PageProps<"/agents/[agent]">) => {
  const { agent: agentId } = await params;
  const agent = getAgentById(agentId);

  if (!agent) {
    notFound();
  }

  return (
    <>
      <div className="grid gap-8 sm:gap-20">
        <div className="grid gap-4">
          <Image
            alt={agent.name}
            className="size-10 rounded-full"
            height={40}
            src={agent.logo}
            width={40}
          />
          <div className="flex items-center gap-2">
            <span className="rounded-full border bg-muted/50 px-3 py-1 text-xs">
              {categoryLabels[agent.category]}
            </span>
          </div>
          <h1 className="mb-0 max-w-xl text-balance font-semibold text-3xl leading-none tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl">
            {agent.name}
          </h1>
          <p className="max-w-xl text-balance text-lg text-muted-foreground tracking-tight">
            {agent.description}
          </p>
          <div className="flex w-full max-w-lg flex-col items-center gap-2 sm:flex-row">
            <Installer
              command={`npx ultracite@latest init --agents ${agent.id}`}
            />
            <Button
              className="px-4"
              asChild
              size="lg"
              variant="link"
            >
              <a
                href={agent.website}
                rel="noopener noreferrer"
                target="_blank"
              >
                Visit {agent.name}
              </a>
            </Button>
          </div>
        </div>

        <div className="grid gap-16">
          <section className="grid gap-8">
            <div className="grid gap-4">
              <h2 className="font-semibold text-2xl tracking-tight">
                Key features
              </h2>
              <p className="max-w-2xl text-muted-foreground">
                What makes {agent.name} great for AI-assisted development.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {agent.features.map((feature) => (
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
                Ultracite automatically creates and manages the configuration
                file for {agent.name}.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border p-4">
                <p className="font-medium text-sm">Config file</p>
                <code className="mt-1 block text-muted-foreground text-sm">
                  {agent.configPath}
                </code>
              </div>
              <div className="rounded-lg border p-4">
                <p className="font-medium text-sm">Update mode</p>
                <p className="mt-1 text-muted-foreground text-sm">
                  {agent.config.appendMode
                    ? "Appends to existing configuration"
                    : "Replaces configuration file"}
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
                Ultracite provides a set of rules that guide {agent.name} to
                generate code that follows your project's linting and formatting
                standards.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border p-6">
                <div className="mb-2 flex size-8 items-center justify-center rounded-full bg-muted font-medium text-sm">
                  1
                </div>
                <h3 className="mb-2 font-medium">Initialize</h3>
                <p className="text-muted-foreground text-sm">
                  Run the init command with the --agents flag to set up{" "}
                  {agent.name} support.
                </p>
              </div>
              <div className="rounded-lg border p-6">
                <div className="mb-2 flex size-8 items-center justify-center rounded-full bg-muted font-medium text-sm">
                  2
                </div>
                <h3 className="mb-2 font-medium">Configure</h3>
                <p className="text-muted-foreground text-sm">
                  Ultracite creates{" "}
                  <code className="text-xs">{agent.configPath}</code> with your
                  project rules.
                </p>
              </div>
              <div className="rounded-lg border p-6">
                <div className="mb-2 flex size-8 items-center justify-center rounded-full bg-muted font-medium text-sm">
                  3
                </div>
                <h3 className="mb-2 font-medium">Code</h3>
                <p className="text-muted-foreground text-sm">
                  {agent.name} now generates code that matches your Ultracite
                  configuration.
                </p>
              </div>
            </div>
          </section>

          <section className="grid gap-8">
            <div className="grid gap-4">
              <h2 className="font-semibold text-2xl tracking-tight">
                Why use Ultracite with {agent.name}?
              </h2>
              <p className="max-w-2xl text-muted-foreground">
                AI coding assistants generate code faster, but without guidance
                they may not follow your project's conventions.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border p-6">
                <h3 className="mb-2 font-medium">Consistent output</h3>
                <p className="text-muted-foreground text-sm">
                  Generated code follows your linting rules from the start,
                  reducing cleanup work.
                </p>
              </div>
              <div className="rounded-lg border p-6">
                <h3 className="mb-2 font-medium">Fewer iterations</h3>
                <p className="text-muted-foreground text-sm">
                  The AI understands your standards upfront, producing
                  acceptable code faster.
                </p>
              </div>
              <div className="rounded-lg border p-6">
                <h3 className="mb-2 font-medium">Team alignment</h3>
                <p className="text-muted-foreground text-sm">
                  Everyone's AI assistant generates code that matches your
                  team's style guide.
                </p>
              </div>
            </div>
          </section>

          <section className="grid gap-8">
            <div className="grid gap-4">
              <h2 className="font-semibold text-2xl tracking-tight">
                Other agents
              </h2>
              <p className="max-w-2xl text-muted-foreground">
                Ultracite supports {agents.length} AI coding assistants. Here
                are some others you might be interested in.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {agents
                .filter((a) => a.id !== agent.id)
                .slice(0, 4)
                .map((otherAgent) => (
                  <Link
                    className="rounded-lg border p-4 transition-colors hover:bg-muted/50"
                    href={`/agents/${otherAgent.id}`}
                    key={otherAgent.id}
                  >
                    <p className="font-medium text-sm">{otherAgent.name}</p>
                    <p className="mt-1 line-clamp-2 text-muted-foreground text-xs">
                      {otherAgent.description}
                    </p>
                  </Link>
                ))}
            </div>

            <Button
              className="w-fit"
              asChild
              variant="outline"
            >
              <Link href="/docs">View all agents</Link>
            </Button>
          </section>
        </div>
      </div>

      <CallToAction />
      <Footer />
    </>
  );
};

export default AgentPage;
