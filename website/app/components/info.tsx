/* eslint-disable @typescript-eslint/naming-convention, react/no-danger */

import { GitHubLogoIcon } from '@radix-ui/react-icons';
import { Logo } from '@/components/logo';
import { getReadme, getRepo } from '../../lib/octokit';
import type { ReactElement } from 'react';

export const Info = async (): Promise<ReactElement> => {
  const repo = await getRepo();
  const readme = await getReadme();

  return (
    <div className="bg-neutral-100 md:overflow-y-auto md:h-screen py-20 px-4">
      <div className="prose prose-neutral prose-img:m-0 mx-auto max-w-lg">
        <div className="not-prose text-neutral-950 flex items-center justify-between">
          <Logo />
          <a
            href={repo.data.html_url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View on GitHub"
          >
            <GitHubLogoIcon className="w-6 h-6" />
          </a>
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
