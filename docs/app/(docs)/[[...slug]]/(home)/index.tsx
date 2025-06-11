import { Benefits } from './components/benefits';
import { Demo } from './components/demo';
import { Hero } from './components/hero';
import { Tweets } from './components/tweets';

const Home = () => {
  return (
    <div className="w-full divide-y divide-dotted px-0 pt-[var(--fd-nav-height)]">
      <Hero />
      <Demo />
      <Benefits />
      <Tweets />
    </div>
  );
};

export default Home;
