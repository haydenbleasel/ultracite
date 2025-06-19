import { Benefits } from './components/benefits';
import { CallToAction } from './components/cta';
import { Footer } from './components/footer';
import { Hero } from './components/hero';
import { Recommendation } from './components/recommendation';
import { Tweets } from './components/tweets';

const Home = () => (
  <div className="container mx-auto mt-[var(--fd-nav-height)] grid w-full gap-16 px-8 pt-24 pb-8 md:gap-24">
    <Hero />
    <Benefits />
    <Recommendation />
    <Tweets />
    <CallToAction />
    <Footer />
  </div>
);

export default Home;
