/* eslint-disable @typescript-eslint/naming-convention, react/no-danger */

import { Logo } from '@/components/logo';
import { getReadme } from '../../lib/octokit';
import type { ReactElement } from 'react';

export const Info = async (): Promise<ReactElement> => {
  const readme = await getReadme();

  return (
    <div className="bg-neutral-100 md:overflow-y-auto md:h-screen py-20 px-4">
      <div className="prose prose-neutral prose-img:m-0 mx-auto max-w-lg">
        <div className="text-neutral-950">
          <Logo />
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
