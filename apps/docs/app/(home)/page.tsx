import type { Metadata } from "next";
import { Agents } from "./components/agents";
import { Cloud } from "./components/cloud";
import { CallToAction } from "./components/cta";
import { Demo } from "./components/demo";
import { Footer } from "./components/footer";
import { Hero } from "./components/hero";
import { IDE } from "./components/ide";
import { Logos } from "./components/logos";
import { Social } from "./components/social";
import { ZeroConfig } from "./components/zero-config";

const title =
  "A highly opinionated, zero-configuration preset for ESLint, Biome and Oxlint. | Ultracite";
const description =
  "Ultracite is a highly opinionated preset for ESLint, Biome and Oxlint; designed to help you and your AI models write consistent and type-safe code without the hassle of configuration.";

export const metadata: Metadata = {
  title,
  description,
};

const Home = () => (
  <div className="mt-16 grid gap-16 sm:mt-24 sm:gap-24 md:gap-32">
    <Hero description={description}>
      <Demo />
    </Hero>
    <Logos />
    <ZeroConfig />
    <IDE />
    <Agents />
    <Cloud />
    <Social />
    <CallToAction />
    <Footer />
  </div>
);

export default Home;
