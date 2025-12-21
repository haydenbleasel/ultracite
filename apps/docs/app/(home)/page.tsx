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

const title = "A highly opinionated, zero-configuration preset for ESLint, Biome and Oxlint.";
const description = "Ultracite is a highly opinionated preset for ESLint, Biome and Oxlint; designed to help you and your AI models write consistent and type-safe code without the hassle of configuration.";

export const metadata: Metadata = {
  title,
  description,
};

const Home = () => (
  <>
    <Hero title={title} description={description}>
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
  </>
);

export default Home;
