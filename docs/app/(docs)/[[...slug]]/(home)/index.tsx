import { Benefits } from './components/benefits';
import { CallToAction } from './components/cta';
import { Footer } from './components/footer';
import { Hero } from './components/hero';
import { Recommendation } from './components/recommendation';
import { Tweets } from './components/tweets';

const Home = () => (
  <div className="w-full divide-y divide-dotted px-0 pt-[var(--fd-nav-height)]">
    <Hero />
    <Benefits />
    <Recommendation />
    <Tweets />
    <CallToAction />
    <Footer />
  </div>
);

export default Home;
