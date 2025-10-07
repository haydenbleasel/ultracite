import { Agents } from "./components/agents";
import { Benefits } from "./components/benefits";
import { Comparison } from "./components/comparison";
import { CallToAction } from "./components/cta";
import { Footer } from "./components/footer";
import { Hero } from "./components/hero";
import { IDE } from "./components/ide";
import { Logos } from "./components/logos";
import { Tweets } from "./components/tweets";
import { ZeroConfig } from "./components/zero-config";

const Home = () => (
  <div className="container relative mx-auto grid gap-32 py-16">
    <Hero />
    <Logos />
    <Comparison />
    <Benefits />
    <ZeroConfig />
    <IDE />
    <Agents />
    <Tweets />
    <CallToAction />
    <Footer />
  </div>
);

export default Home;
