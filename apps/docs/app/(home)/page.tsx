import type { Metadata } from "next";
import { Agents } from "./components/agents";
import { Cloud } from "./components/cloud";
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
  <div className="grid gap-16 sm:gap-24 md:gap-32">
    <Hero description={description}>
      <Demo />
    </Hero>
    <Logos />
    <ZeroConfig />
    <IDE />
    <Agents />
    <Cloud />
    <Social />
    <Footer />
  </div>
);

export default Home;
