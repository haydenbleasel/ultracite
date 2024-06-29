/* eslint-disable @typescript-eslint/naming-convention, react/no-danger */

import { GitHubLogoIcon, MagnifyingGlassIcon } from '@radix-ui/react-icons';
import { Logo } from '@/components/logo';
import { getReadme, getRepo } from '../../lib/octokit';
import type { ReactElement } from 'react';

export const Info = async (): Promise<ReactElement> => {
  const repo = await getRepo();
  const readme = await getReadme();

  return (
    <div className="bg-neutral-50 md:overflow-y-auto md:h-screen py-20 px-4">
      <div className="prose prose-neutral prose-img:m-0 mx-auto max-w-lg">
        <div className="not-prose text-neutral-950 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-4">
            <a
              href="/inspector"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open Inspector"
            >
              <MagnifyingGlassIcon className="w-6 h-6" />
            </a>
            <a
              href={repo.data.html_url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="View on GitHub"
            >
              <GitHubLogoIcon className="w-5 h-5" />
            </a>
          </div>
        </div>
        <div
          className="mt-8"
          dangerouslySetInnerHTML={{
            __html: readme,
          }}
        />
      </div>
    </div>
  );
};
