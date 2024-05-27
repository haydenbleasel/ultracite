/* eslint-disable @typescript-eslint/naming-convention, react/no-danger */

import { marked } from 'marked';
import type { ReactElement } from 'react';
import { getChangelog } from '@/lib/octokit';
import { dateFormatter } from '@/lib/date';

export const Changelog = async (): Promise<ReactElement> => {
  const changelog = await getChangelog();

  return (
    <div className="relative h-screen overflow-auto py-20">
      {changelog.data.map((release) => (
        <div key={release.id} className="prose prose-neutral max-w-lg mx-auto">
          <h2>{release.name}</h2>
          <time dateTime={release.created_at}>
            {dateFormatter.format(new Date(release.created_at))}
          </time>
          <div
            dangerouslySetInnerHTML={{
              __html: release.body ? marked.parse(release.body) : '',
            }}
          />
        </div>
      ))}
    </div>
  );
};
