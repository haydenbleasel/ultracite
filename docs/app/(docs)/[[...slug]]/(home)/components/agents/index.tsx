import Image from "next/image";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import aider from "./logos/aider.svg";
import amp from "./logos/amp.svg";
import augment from "./logos/augment-code.svg";
import claude from "./logos/claude.svg";
import cline from "./logos/cline.svg";
import codex from "./logos/codex.svg";
import cursor from "./logos/cursor.svg";
import firebase from "./logos/firebase-studio.svg";
import gemini from "./logos/gemini.svg";
import goose from "./logos/goose.svg";
import junie from "./logos/junie.svg";
import kilo from "./logos/kilo-code.svg";
import kiro from "./logos/kiro.svg";
import open from "./logos/open-hands.svg";
import vscode from "./logos/vscode.svg";
import windsurf from "./logos/windsurf.svg";
import zed from "./logos/zed.svg";

const logos = [
  {
    name: "Visual Studio Code",
    src: vscode,
  },
  {
    name: "Cursor",
    src: cursor,
  },
  {
    name: "Windsurf",
    src: windsurf,
  },
  {
    name: "Zed",
    src: zed,
  },
  {
    name: "Claude Code",
    src: claude,
  },
  {
    name: "OpenAI Codex",
    src: codex,
  },
  {
    name: "Firebase Studio",
    src: firebase,
  },
  {
    name: "Gemini CLI",
    src: gemini,
  },
  {
    name: "Junie",
    src: junie,
  },
  {
    name: "Kilo Code",
    src: kilo,
  },
  {
    name: "Kiro",
    src: kiro,
  },
  {
    name: "Open Hands",
    src: open,
  },
  {
    name: "Augment Code",
    src: augment,
  },
  {
    name: "Cline",
    src: cline,
  },
  {
    name: "AMP",
    src: amp,
  },
  {
    name: "Aider",
    src: aider,
  },
  {
    name: "Codename Goose",
    src: goose,
  },
];

const HALF = Math.ceil(logos.length / 2);
const row1 = logos.slice(0, HALF);
const row2 = logos.slice(HALF);

export const Agents = () => (
  <div className="grid gap-16">
    <div className="mx-auto grid max-w-3xl gap-4 text-center">
      <h2 className="font-semibold text-4xl tracking-tight">
        Works with all your favourite agents
      </h2>
      <p className="text-balance text-muted-foreground text-xl">
        Ultracite can generate rules files for all these popular IDEs and
        agents, so you can get the most of out of your AI integrations.
      </p>
    </div>
    <div className="flex flex-col gap-4">
      <div className="mx-auto flex items-center justify-center gap-4">
        {row1.map((logo) => (
          <Tooltip delayDuration={0} key={logo.name}>
            <TooltipTrigger>
              <Image
                alt={logo.name}
                className="overflow-hidden rounded-full ring-1 ring-foreground/10"
                key={logo.name}
                src={logo.src}
              />
            </TooltipTrigger>
            <TooltipContent>{logo.name}</TooltipContent>
          </Tooltip>
        ))}
      </div>
      <div className="mx-auto flex items-center justify-center gap-4">
        {row2.map((logo) => (
          <Tooltip delayDuration={0} key={logo.name}>
            <TooltipTrigger>
              <Image
                alt={logo.name}
                className="overflow-hidden rounded-full ring-1 ring-foreground/10"
                key={logo.name}
                src={logo.src}
              />
            </TooltipTrigger>
            <TooltipContent>{logo.name}</TooltipContent>
          </Tooltip>
        ))}
      </div>
    </div>
  </div>
);
