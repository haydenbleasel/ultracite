import type { FC, ReactNode } from 'react';
import '../styles/tailwind.css';
import 'focus-visible';
import clsx from 'clsx';
import { display, mono, sans } from '../lib/fonts';
import { GitHubIcon, TwitterIcon } from '../components/icons';
import { Button } from '@beskar-labs/gravity/button';
import octokit from '../lib/octokit';
import Link from 'next/link';

const RootLayout = async ({
  children,
}: {
  children: ReactNode;
}): Promise<ReactNode> => {
  const repo = await octokit.repos.get({
    owner: 'beskar-co',
    repo: 'harmony',
  });

  return (
    <html lang="en" className="h-full antialiased">
      <body
        className={clsx(
          "flex min-h-full font-sans flex-col bg-white dark:bg-gray-950",
          sans.variable,
          mono.variable,
          display.variable
        )}
      >
        <div className="relative flex-none overflow-hidden px-6 lg:pointer-events-none lg:fixed lg:inset-0 lg:z-40 lg:flex lg:px-0">
          <div className="relative flex w-full bg-neutral-100 lg:pointer-events-auto lg:mr-[calc(max(2rem,50%-38rem)+40rem)] lg:min-w-[32rem] lg:overflow-y-auto lg:pl-[max(4rem,calc(50%-38rem))]">
            <div className="mx-auto max-w-lg lg:mx-0 lg:flex lg:w-96 lg:max-w-none lg:flex-col lg:before:flex-1 lg:before:pt-6">
              <div className="pb-16 pt-20 sm:pb-20 sm:pt-32 lg:py-20">
                <div className="relative">
                  <div>
                    <Link href="/" className="text-neutral-500 hover:text-neutral-400 transition-colors">
                      @{repo.data.owner.login}/{repo.data.name}
                    </Link>
                  </div>
                  <h1 className="mt-8 font-display text-4xl/tight font-light text-neutral-950">
                    {repo.data.description}
                  </h1>
                  <Button className="mt-8 inline-flex items-center" href={repo.data.html_url}>
                    <GitHubIcon className="w-4 h-4 mr-2" />
                    View on GitHub
                  </Button>
                </div>
              </div>
              <div className="flex flex-1 items-end justify-center pb-4 lg:justify-start lg:pb-6">
                <p className="flex items-center gap-x-2 text-[0.8125rem]/6 text-neutral-500">
                  Brought to you by{' '}
                  <Button variant="link" href="https://twitter.com/haydenbleasel">
                    <TwitterIcon className="mr-2 h-4 w-4" />
                    @haydenbleasel
                  </Button>
                </p>
              </div>
            </div>
          </div>
        </div>
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
                    className="stroke-sky-900/10 dark:stroke-white/10 xl:stroke-neutral-950/10"
                    fill="none"
                  />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill={`url(#timeline)`} />
            </svg>
          </div>
          <main className="space-y-20 py-20 sm:space-y-32 sm:py-32">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
};

export default RootLayout;
