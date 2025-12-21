import { Assistant } from "./assistant";
import { Editor } from "./editor";
import { Indicator } from "./indicator";
import { Problems } from "./problems";
import { Sidebar } from "./sidebar";

export const IDE = () => (
  <div className="grid gap-8">
    <div className="mx-auto grid max-w-3xl gap-4 text-center">
      <h2 className="text-balance font-semibold text-3xl md:text-4xl tracking-tighter">
        Designed for <span className="italic">humans</span> and{" "}
        <span className="italic">AI</span>
      </h2>
      <p className="text-balance text-lg text-muted-foreground tracking-tight">
        Ensure consistent code style and quality across all team members and AI
        models, eliminating debates over formatting and reducing code review
        friction.
      </p>
    </div>
    <div className="grid items-start gap-8 xl:grid-cols-[200px_1fr_200px]">
      <div className="order-1 grid gap-8 sm:grid-cols-2 md:grid-cols-3 xl:order-0 xl:grid-cols-1 xl:gap-0">
        <Indicator
          className="xl:mt-5"
          description="Add formatting rules for AI agents and run Ultracite in agent loops."
          title="Agent Integration"
        />
        <Indicator
          className="xl:mt-10"
          description="Automatically generate editor-specific rule files to work with Ultracite."
          title="Editor configuration"
        />
        <Indicator
          className="xl:mt-24"
          description="Zero configuration Biome configuration out of the box."
          title="Configurable spec"
        />
      </div>
      <div className="hidden aspect-video grid-cols-[180px_1fr_200px] divide-x overflow-hidden rounded-2xl border bg-sidebar md:grid">
        <Sidebar />
        <div className="grid grid-rows-[2fr_1fr] overflow-hidden">
          <Editor />
          <Problems />
        </div>
        <Assistant />
      </div>
      <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-1 xl:gap-0 xl:text-right">
        <Indicator
          className="xl:mt-38"
          description="Lint and format code without needing to run Ultracite locally."
          reverse
          title="MCP Support"
        />
        <Indicator
          className="xl:mt-24"
          description="Biome uses the VS Code output panel to show problems."
          reverse
          title="Output panel"
        />
      </div>
    </div>
  </div>
);
