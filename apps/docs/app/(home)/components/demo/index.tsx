import Image from "next/image";
import Background from "./background.jpg";

const Line = ({ children }: { children?: React.ReactNode }) => (
  <div>{children}</div>
);

const Gray = ({ children }: { children: React.ReactNode }) => (
  <span className="text-muted-foreground">{children}</span>
);

const Green = ({ children }: { children: React.ReactNode }) => (
  <span className="text-green-400">{children}</span>
);

const Cyan = ({ children }: { children: React.ReactNode }) => (
  <span className="text-cyan-400">{children}</span>
);

const Output = () => (
  <>
    <Line>
      <Gray>$</Gray> bun x ultracite@latest init
    </Line>
    <br />
    <Line>
      <Cyan>●</Cyan> <Gray>Detected lockfile, using <Cyan>bun</Cyan></Gray>
    </Line>
    <Line>
      <Gray>│</Gray>
    </Line>
    <Line>
      <Green>◇</Green> Which formatters / linters do you want to use?
    </Line>
    <Line>
      <Gray>│</Gray> <Gray>Biome</Gray>
    </Line>
    <Line>
      <Gray>│</Gray>
    </Line>
    <Line>
      <Green>◇</Green> Which frameworks are you using?
    </Line>
    <Line>
      <Gray>│</Gray> <Gray>React, Next.js</Gray>
    </Line>
    <Line>
      <Gray>│</Gray>
    </Line>
    <Line>
      <Green>◇</Green> Which editors do you want to configure?
    </Line>
    <Line>
      <Gray>│</Gray> <Gray>VSCode / Cursor / Windsurf</Gray>
    </Line>
    <Line>
      <Gray>│</Gray>
    </Line>
    <Line>
      <Green>◇</Green> Which agents do you want to enable?
    </Line>
    <Line>
      <Gray>│</Gray> <Gray>Cursor, Claude Code</Gray>
    </Line>
    <Line>
      <Gray>│</Gray>
    </Line>
    <Line>
      <Green>◇</Green> Which agent hooks do you want to enable?
    </Line>
    <Line>
      <Gray>│</Gray> <Gray>Cursor, Claude Code</Gray>
    </Line>
    <Line>
      <Gray>│</Gray>
    </Line>
    <Line>
      <Cyan>◆</Cyan> Would you like any of the following Git hooks?
    </Line>
    <Line>
      <Gray>│</Gray> <Gray>◻</Gray> Husky 
    </Line>
    <Line>
      <Gray>│</Gray> <Gray>◻</Gray> Lefthook 
    </Line>
    <Line>
      <Gray>│</Gray> <Gray>◻</Gray> Lint-staged 
    </Line>
    <Line>
      <Gray>│</Gray> <Gray>◻</Gray> pre-commit (Python framework) 
    </Line>
  </>
);

export const Demo = () => (
  <div className="relative isolate overflow-hidden rounded-xl sm:rounded-2xl md:rounded-3xl">
    <Image
      alt=""
      className="absolute top-0 left-0 size-full object-cover"
      height={1000}
      src={Background}
      width={1000}
    />
    <div className="size-full sm:px-16 sm:pt-16">
      <div className="max-h-128 overflow-hidden border border-white/10 bg-black/80 p-8 backdrop-blur-sm sm:rounded-x-2xl sm:rounded-t-2xl">
        <div className="grid grid-cols-3 mb-8 select-none pointer-events-none">
          <div className="flex items-center gap-2">
            <div className="size-2 rounded-full bg-muted-foreground" />
            <div className="size-2 rounded-full bg-muted-foreground" />
            <div className="size-2 rounded-full bg-muted-foreground" />
          </div>
          <div className="flex items-center justify-center">
            <p className="text-sm text-muted-foreground font-mono">Terminal</p>
          </div>
        </div>
        <pre className="font-mono text-sm text-white">
          <code>
            <Output />
          </code>
        </pre>
      </div>
    </div>
  </div>
);
