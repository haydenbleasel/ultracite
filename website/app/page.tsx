import { getRepo } from '../lib/octokit';
import { Info } from './components/info';
import { Changelog } from './components/changelog';
import type { Metadata } from 'next';
import type { FC } from 'react';

export const generateMetadata = async (): Promise<Metadata> => {
  const repo = await getRepo();

  return {
    title: 'Ultracite | Hayden Bleasel',
    description: repo.data.description,
    metadataBase: new URL(process.env.VERCEL_PROJECT_PRODUCTION_URL ?? ''),
  };
};

const Page: FC = () => (
  <div className="grid lg:grid-cols-2">
    <Info />
    <Changelog />
  </div>
);

export default Page;
