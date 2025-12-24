import Image from "next/image";
import Adobe from "./adobe.svg";
import Arcade from "./arcade.svg";
import AlanTuringInstitute from "./ati.svg";
import Axiom from "./axiom.svg";
import Clerk from "./clerk.svg";
import Consent from "./consent.svg";
import ElevenLabs from "./elevenlabs.svg";
import FrenchGovernment from "./french-government.svg";
import MagicUI from "./magic-ui.svg";
import Profound from "./profound.svg";
import Redpanda from "./redpanda.svg";
import Tencent from "./tencent.svg";
import VA from "./va.svg";
import Vercel from "./vercel.svg";
import Workday from "./workday.svg";

const logos = [
  {
    name: "Vercel",
    src: Vercel,
  },
  {
    name: "Profound",
    src: Profound,
  },
  {
    name: "Adobe",
    src: Adobe,
  },
  {
    name: "Clerk",
    src: Clerk,
  },
  {
    name: "Alan Turing Institite",
    src: AlanTuringInstitute,
  },
  {
    name: "Consent",
    src: Consent,
  },
  {
    name: "VA",
    src: VA,
  },
  {
    name: "French Government",
    src: FrenchGovernment,
  },
  {
    name: "Tencent",
    src: Tencent,
  },
  {
    name: "Arcade",
    src: Arcade,
  },
  {
    name: "Axiom",
    src: Axiom,
  },
  {
    name: "Magic UI",
    src: MagicUI,
  },
  {
    name: "Redpanda",
    src: Redpanda,
  },
  {
    name: "Workday",
    src: Workday,
  },
  {
    name: "ElevenLabs",
    src: ElevenLabs,
  },
];

export const Logos = () => (
  <div className="grid gap-8">
    <div className="mx-auto grid max-w-xl gap-4 text-center">
      <h2 className="text-balance font-semibold text-3xl tracking-tighter md:text-4xl">
        Trusted by top companies
      </h2>
      <p className="text-balance text-lg text-muted-foreground tracking-tight">
        And used by{" "}
        <a
          className="underline"
          href="https://github.com/haydenbleasel/ultracite/network/dependents"
          rel="noreferrer"
          target="_blank"
        >
          thousands
        </a>{" "}
        of open source projects.
      </p>
    </div>
    <div className="grid grid-cols-5 divide-x divide-y border-t border-l">
      {logos.map((logo) => (
        <div
          className="flex aspect-video w-full items-center justify-center p-12 last:border-r last:border-b"
          key={logo.name}
        >
          <Image
            alt={logo.name}
            className="size-full object-contain"
            height={48}
            src={logo.src}
            width={48}
          />
        </div>
      ))}
    </div>
  </div>
);
