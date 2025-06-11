import { Benefits } from './components/benefits';
import { Hero } from './components/hero';
import { Tweets } from './components/tweets';

const Home = () => {
  return (
    <div className="w-full divide-y divide-dotted px-0 pt-[var(--fd-nav-height)]">
      <Hero />
      <Benefits />
      <Tweets />
    </div>
  );
};

export default Home;
