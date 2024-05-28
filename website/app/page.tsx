import { getRepo } from '../lib/octokit';
import { Info } from './components/info';
import { Changelog } from './components/changelog';
import type { Metadata } from 'next';
import type { FC } from 'react';

const projectUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;
const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';

if (!projectUrl) {
  throw new Error('Missing VERCEL_PROJECT_PRODUCTION_URL');
}

export const generateMetadata = async (): Promise<Metadata> => {
  const repo = await getRepo();

  return {
    title: 'Ultracite | Hayden Bleasel',
    description: repo.data.description,
    metadataBase: new URL(
      `${protocol}://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    ),
  };
};

const Page: FC = () => (
  <div className="grid lg:grid-cols-2 divide-x divide-neutral-200">
    <Info />
    <Changelog />
  </div>
);

export default Page;
