import Image from "next/image";
import Adobe from "./adobe.svg";
import AlanTuringInstitute from "./ati.svg";
import Consent from "./consent.svg";
import Profound from "./profound.svg";
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
];

export const Logos = () => (
  <div className="grid gap-8 px-8 py-16">
    <p className="text-center text-muted-foreground text-sm">
      Used by these amazing companies and{" "}
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
    <div className="mx-auto grid max-w-5xl grid-cols-2 flex-col items-center gap-16 sm:grid-cols-3 md:grid-cols-6">
      {logos.map((item) => (
        <Image
          alt=""
          className="w-full dark:brightness-0 dark:invert"
          key={item.name}
          src={item.src}
        />
      ))}
    </div>
  </div>
);
