import Image from "next/image";
import {
  Marquee,
  MarqueeContent,
  MarqueeFade,
  MarqueeItem,
} from "@/components/kibo-ui/marquee";
import Adobe from "./adobe.svg";
import Arcade from "./arcade.svg";
import AlanTuringInstitute from "./ati.svg";
import Axiom from "./axiom.svg";
import Consent from "./consent.svg";
import FrenchGovernment from "./french-government.svg";
import MagicUI from "./magic-ui.svg";
import Profound from "./profound.svg";
import Tencent from "./tencent.svg";
import VA from "./va.svg";
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
];

export const Logos = () => (
  <div className="grid gap-12 px-8">
    <p className="text-center text-muted-foreground text-sm">
      Used by these organizations and{" "}
      <a
        className="underline"
        href="https://github.com/haydenbleasel/ultracite/network/dependents"
        rel="noreferrer"
        target="_blank"
      >
        hundreds
      </a>{" "}
      of open source projects.
    </p>
    <div className="flex size-full items-center justify-center bg-background">
      <Marquee>
        <MarqueeFade side="left" />
        <MarqueeFade side="right" />
        <MarqueeContent pauseOnHover={false}>
          {logos.map((item) => (
            <MarqueeItem key={item.name}>
              <Image
                alt={item.name}
                className="mx-8 h-8 w-auto dark:brightness-0 dark:invert"
                src={item.src}
              />
            </MarqueeItem>
          ))}
        </MarqueeContent>
      </Marquee>
    </div>
  </div>
);
