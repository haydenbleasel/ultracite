import { JsonLd } from "@/components/seo/json-ld";
import { Logos } from "@/components/ultracite/logos";
import { Social } from "@/components/ultracite/social";
import {
  createPageMetadata,
  createSoftwareApplicationStructuredData,
  siteDescription,
} from "@/lib/site-metadata";

import { Agents } from "./components/agents";
import { Demo } from "./components/demo";
import { Editors } from "./components/editors";
import { Hero } from "./components/hero";
import { IdePreview } from "./components/ide";
import { ZeroConfig } from "./components/zero-config";

const title = "Zero-Config Linting for Biome, ESLint, and Oxlint";
const description = siteDescription;

export const metadata = createPageMetadata({
  description,
  path: "/",
  title,
});

const Home = () => (
  <>
    <JsonLd data={createSoftwareApplicationStructuredData()} />
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
  </>
);

export default Home;
