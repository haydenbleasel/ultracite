import Image from "next/image";
import Link from "next/link";
import Angular from "./logos/angular.svg";
import Nextjs from "./logos/nextjs.svg";
import Qwik from "./logos/qwik.svg";
import React from "./logos/react.svg";
import Remix from "./logos/remix.svg";
import Solid from "./logos/solid.svg";
import Svelte from "./logos/svelte.svg";
import Vue from "./logos/vue.svg";

const logos = [
  {
    id: "react",
    name: "React",
    src: React,
  },
  {
    id: "next",
    name: "Next.js",
    src: Nextjs,
  },
  {
    id: "solid",
    name: "Solid.js",
    src: Solid,
  },
  {
    id: "vue",
    name: "Vue.js",
    src: Vue,
  },
  {
    id: "qwik",
    name: "Qwik",
    src: Qwik,
  },
  {
    id: "angular",
    name: "Angular",
    src: Angular,
  },
  {
    id: "remix",
    name: "Remix",
    src: Remix,
  },
  {
    id: "svelte",
    name: "Svelte",
    src: Svelte,
  },
];

export const Presets = async () => (
  <div className="grid gap-16">
    <div className="mx-auto grid max-w-2xl gap-4 text-center">
      <h2 className="font-semibold text-3xl tracking-tight sm:text-4xl">
        Preconfigured for your framework
      </h2>
      <p className="text-balance text-lg text-muted-foreground sm:text-xl">
        Ultracite provides framework-specific presets that you can compose to
        create a custom configuration.
      </p>
    </div>
    <div className="flex items-center justify-center gap-12">
      {logos.map((logo) => (
        <Link href={`/preset/${logo.id}`} key={logo.id}>
          <Image
            alt={logo.name}
            className="h-12 w-auto"
            height={48}
            src={logo.src}
            width={48}
          />
        </Link>
      ))}
    </div>
  </div>
);
