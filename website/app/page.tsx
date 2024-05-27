import { marked } from 'marked';
import Link from 'next/link';
import { getChangelog, getRepo } from '../lib/octokit';
import { Article } from '../components/mdx';
import { GitHubIcon, NpmIcon, TwitterIcon } from '../components/icons';
import { Button } from '../components/button';
import { Logo } from '../components/logo';
import type { Metadata } from 'next';
import type { FC } from 'react';

export const generateMetadata = async (): Promise<Metadata> => {
  const repo = await getRepo();

  return {
    title: 'Harmony',
    description: repo.data.description,
    metadataBase: new URL(process.env.VERCEL_PROJECT_PRODUCTION_URL ?? ''),
  };
};

const Info = async () => {
  const repo = await getRepo();

  return (
    <div className="relative flex-none overflow-hidden lg:pointer-events-none lg:fixed lg:inset-0 lg:z-40 lg:flex">
      <div className="relative flex w-full px-6 lg:pointer-events-auto lg:mr-[calc(max(2rem,50%-38rem)+40rem)] lg:min-w-[32rem] lg:overflow-y-auto lg:px-0 lg:pl-[max(4rem,calc(50%-38rem))] bg-neutral-100">
        <div className="mx-auto max-w-lg lg:mx-0 lg:flex lg:w-96 lg:max-w-none lg:flex-col lg:before:flex-1 lg:before:pt-6">
          <div className="pb-16 pt-20 sm:pb-20 sm:pt-32 lg:py-20">
            <div className="dark relative">
              <div>
                <Link href="/" className="text-neutral-950">
                  <Logo />
                </Link>
              </div>
              <h1 className="mt-4 font-display text-4xl/tight font-semibold text-white">
                {repo.data.description}
              </h1>
              <div className="mt-8 flex flex-col sm:items-center gap-2 sm:flex-row">
                <Button
                  className="inline-flex items-center"
                  href="https://npmjs.com/package/eslint-config-harmony"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <NpmIcon className="mr-2 h-4 w-4" />
                  Download
                </Button>
                <Button
                  className="inline-flex items-center dark:border-white/20 dark:hover:bg-white/10"
                  href={repo.data.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="tertiary"
                >
                  <GitHubIcon className="mr-2 h-4 w-4" />
                  View source
                </Button>
              </div>
            </div>
          </div>
          <div className="dark relative z-10 flex flex-1 items-end justify-center pb-4 lg:justify-start lg:pb-6">
            <p className="flex items-center gap-x-2 text-[0.8125rem]/6 text-white/70">
              Brought to you by{' '}
              <Button
                variant="link"
                href="https://twitter.com/haydenbleasel"
                target="_blank"
                rel="noopener noreferrer"
              >
                <TwitterIcon className="mr-2 h-4 w-4" />
                @haydenbleasel
              </Button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const Changelog = async () => {
  const changelog = await getChangelog();

  return (
    <div className="relative flex-auto">
      <div className="pointer-events-none absolute inset-0 z-50 overflow-hidden lg:right-[calc(max(2rem,50%-38rem)+40rem)] lg:min-w-[32rem] lg:overflow-visible">
        <svg
          className="absolute left-[max(0px,calc(50%-18.125rem))] top-0 h-full w-1.5 lg:left-full lg:ml-1 xl:left-auto xl:right-1 xl:ml-0"
          aria-hidden="true"
        >
          <defs>
            <pattern
              id="timeline"
              width="6"
              height="8"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M0 0H6M0 8H6"
                className="stroke-sky-900/10 dark:stroke-white/10 xl:stroke-white/10"
                fill="none"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#timeline)" />
        </svg>
      </div>
      <main className="space-y-20 py-20 sm:space-y-32 sm:py-32">
        {changelog.data.map((release) => (
          <Article id={release.id} date={release.created_at} key={release.id}>
            <h2>{release.name}</h2>
            {release.body ? (
              // eslint-disable-next-line react/no-danger, @typescript-eslint/naming-convention
              <div
                // eslint-disable-next-line react/no-danger
                dangerouslySetInnerHTML={{
                  // eslint-disable-next-line @typescript-eslint/naming-convention
                  __html: marked.parse(release.body),
                }}
              />
            ) : null}
          </Article>
        ))}
      </main>
    </div>
  );
};

const Page: FC = () => (
  <>
    <Info />
    <Changelog />
  </>
);

export default Page;
