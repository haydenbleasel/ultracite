import { Benefits } from './components/benefits';
import { CallToAction } from './components/cta';
import { Footer } from './components/footer';
import { Hero } from './components/hero';
import { Tweets } from './components/tweets';
import { ZeroConfig } from './components/zero-config';

const Home = () => (
  <div className='relative mt-[var(--fd-nav-height)] grid gap-16 pt-8 pb-4 sm:gap-24 sm:pt-16 sm:pb-8 md:gap-32'>
    <Hero />
    <Benefits />
    <ZeroConfig />
    <Tweets />
    <CallToAction />
    <Footer />
  </div>
);

export default Home;
