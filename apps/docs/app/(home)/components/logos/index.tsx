import Image from "next/image";
import Adobe from "./adobe.svg";
import Arcade from "./arcade.svg";
import AlanTuringInstitute from "./ati.svg";
import Axiom from "./axiom.svg";
import Clerk from "./clerk.svg";
import Consent from "./consent.svg";
import FrenchGovernment from "./french-government.svg";
import MagicUI from "./magic-ui.svg";
import Profound from "./profound.svg";
import Redpanda from "./redpanda.svg";
import Tencent from "./tencent.svg";
import VA from "./va.svg";
import Workday from "./workday.svg";
import Vercel from "./vercel.svg";

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
];

export const Logos = () => (
  <div className="grid gap-8">
    <div className="mx-auto grid max-w-xl gap-4 text-center">
      <h2 className="text-balance font-semibold text-3xl md:text-4xl tracking-tighter">
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
    <div className="grid grid-cols-5 border-l border-t divide-x divide-y">
        {logos.map((logo) => (
          <div className="w-full aspect-video p-12 flex items-center justify-center last:border-r last:border-b" key={logo.name}>
            <Image alt={logo.name} height={48} src={logo.src} width={48} className="size-full object-contain" />
          </div>
        ))}
    </div>
  </div>
);
