/* eslint-disable @typescript-eslint/naming-convention, react/no-danger */

import { getReadme } from '../../lib/octokit';
import type { ReactElement } from 'react';

export const Info = async (): Promise<ReactElement> => {
  const readme = await getReadme();

  return (
    <div className="bg-neutral-100 overflow-y-auto h-screen">
      <div className="prose prose-neutral mx-auto max-w-lg">
        <div
          dangerouslySetInnerHTML={{
            __html: readme.data,
          }}
        />
      </div>
    </div>
  );
};
