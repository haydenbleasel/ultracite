import { Agents } from "./components/agents";
import { Benefits } from "./components/benefits";
import { CallToAction } from "./components/cta";
import { Footer } from "./components/footer";
import { Hero } from "./components/hero";
import { IDE } from "./components/ide";
import { Logos } from "./components/logos";
import { Tweets } from "./components/tweets";
import { ZeroConfig } from "./components/zero-config";

const Home = () => (
  <div className="relative grid divide-y divide-dotted">
    <Hero />
    <Logos />
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
