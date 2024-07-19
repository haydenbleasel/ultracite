/* eslint-disable @typescript-eslint/naming-convention, react/no-danger */

import { Logo } from '@/components/logo';
import { getReadme, getRepo } from '@/lib/octokit';
import { GitHubLogoIcon } from '@radix-ui/react-icons';
import type { ReactElement } from 'react';

export const Info = async (): Promise<ReactElement> => {
  const repo = await getRepo();
  const readme = await getReadme();

  return (
    <div className="bg-neutral-50 px-4 py-20 md:h-screen md:overflow-y-auto">
      <div className="prose prose-neutral prose-img:m-0 mx-auto max-w-lg">
        <div className="not-prose flex items-center justify-between text-neutral-950">
          <Logo />
          <a
            href={repo.data.html_url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View on GitHub"
          >
            <GitHubLogoIcon className="h-5 w-5" />
          </a>
        </div>
        <div
          className="mt-8"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: readme is HTML
          dangerouslySetInnerHTML={{
            __html: readme,
          }}
        />
      </div>
    </div>
  );
};
