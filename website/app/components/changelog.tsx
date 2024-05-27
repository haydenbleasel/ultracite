import { marked } from 'marked';
import type { ReactElement } from 'react';
import { getChangelog } from '@/lib/octokit';
import { Article } from '@/components/mdx';

export const Changelog = async (): Promise<ReactElement> => {
  const changelog = await getChangelog();

  return (
    <div className="relative h-screen overflow-visible">
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
      <main className="space-y-20 py-20 sm:space-y-32 sm:py-32 overflow-y-auto h-full">
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
