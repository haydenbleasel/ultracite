import type { Metadata } from "next";
import Climate from "./components/climate";
import { Features } from "./components/features";
import { Hero } from "./components/hero";
import { Pricing } from "./components/pricing";

const title = "Ultracite Cloud";
const description =
  "Automated linting and AI-powered fixes for your GitHub repositories.";

export const metadata: Metadata = {
  title,
  description,
};

const CloudPage = () => (
  <div className="grid gap-16 sm:gap-24 md:gap-32">
    <Hero />
    <Features />
    <Pricing />
    <Climate />
  </div>
);

export default CloudPage;
