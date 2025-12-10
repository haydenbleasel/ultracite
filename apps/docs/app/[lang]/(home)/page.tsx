import type { Metadata } from "next";
import { Agents } from "./components/agents";
import { Comparison } from "./components/comparison";
import { CallToAction } from "./components/cta";
import { Demo } from "./components/demo";
import { Footer } from "./components/footer";
import { Hero } from "./components/hero";
import { IDE } from "./components/ide";
import { Logos } from "./components/logos";
import { Social } from "./components/social";
import { Videos } from "./components/videos";
import { ZeroConfig } from "./components/zero-config";

export const metadata: Metadata = {
  title:
    "A highly opinionated, zero-configuration linter and formatter. | Ultracite",
  description:
    "Ultracite is a highly opinionated preset for Biome, designed to help you and your AI models write consistent and type-safe code without the hassle of configuration.",
};

const Home = () => (
  <div className="relative mx-auto grid w-full max-w-(--fd-layout-width) gap-24 px-4 sm:gap-32">
    <Hero>
      <Demo />
    </Hero>
    <Logos />
    <Comparison />
    <ZeroConfig />
    <IDE />
    <Agents />
    <Videos />
    <Social />
    <CallToAction />
    <Footer />
  </div>
);

export default Home;
