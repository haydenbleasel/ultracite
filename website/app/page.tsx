import type { Metadata } from 'next';
import type { FC } from 'react';
import { getRepo } from '../lib/octokit';
import { Changelog } from './components/changelog';
import { Info } from './components/info';

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
  <div className="grid divide-x divide-neutral-200 lg:grid-cols-2">
    <Info />
    <Changelog />
  </div>
);

export default Page;
