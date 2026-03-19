import type { Metadata } from "next";

import { Logos } from "@/components/ultracite/logos";
import { Social } from "@/components/ultracite/social";

import { Agents } from "./components/agents";
import { Demo } from "./components/demo";
import { Editors } from "./components/editors";
import { Hero } from "./components/hero";
import { IdePreview } from "./components/ide";
import { ZeroConfig } from "./components/zero-config";

const title =
  "A highly opinionated, zero-configuration preset for ESLint, Biome and Oxlint.";
const description =
  "Ultracite is a highly opinionated preset for ESLint, Biome and Oxlint; designed to help you and your AI models write consistent and type-safe code without the hassle of configuration.";

export const metadata: Metadata = {
  description,
  title,
};

const Home = () => (
  <div className="grid gap-16 sm:gap-24 md:gap-32">
    <Hero description={description}>
      <Demo />
    </Hero>
    <Logos />
    <ZeroConfig />
    <IdePreview />
    <Agents />
    <Editors />
    <Social />
  </div>
);

export default Home;
