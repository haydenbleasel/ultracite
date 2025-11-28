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

const Home = () => (
  <div className="relative mx-auto grid w-full max-w-7xl gap-24 py-16 sm:gap-32">
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
