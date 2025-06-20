import { Benefits } from './components/benefits';
import { CallToAction } from './components/cta';
import { Footer } from './components/footer';
import { Hero } from './components/hero';
import { Recommendation } from './components/recommendation';
import { Tweets } from './components/tweets';

const Home = () => (
  <div className="relative mt-[var(--fd-nav-height)] grid gap-24 pt-16">
    <Hero />
    <Benefits />
    <Recommendation />
    <Tweets />
    <CallToAction />
    <Footer />
  </div>
);

export default Home;
