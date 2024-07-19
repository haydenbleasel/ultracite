/* eslint-disable @typescript-eslint/naming-convention, react/no-danger */

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { dateFormatter } from '@/lib/date';
import { getChangelog } from '@/lib/octokit';
import { marked } from 'marked';
import type { ReactElement } from 'react';

export const Changelog = async (): Promise<ReactElement> => {
  const changelog = await getChangelog();

  const releasesByDay = changelog.reduce<Record<string, typeof changelog>>(
    (acc, release) => {
      const date = new Date(release.created_at).toDateString();
      if (!(date in acc)) {
        acc[date] = [];
      }
      acc[date].push(release);
      return acc;
    },
    {}
  );

  return (
    <div className="relative px-4 py-20 md:h-screen md:overflow-y-auto">
      <Accordion
        type="single"
        className="prose prose-sm prose-neutral mx-auto max-w-lg"
        defaultValue={Object.keys(releasesByDay)[0]}
        collapsible
      >
        {Object.entries(releasesByDay).map(([date, releases]) => (
          <AccordionItem value={date} key={date} className="[&>h3]:m-0">
            <AccordionTrigger>
              <div className="flex flex-1 items-center gap-1 text-left">
                <p className="m-0">{releases[0].name}</p>
                {releases.length > 1 && (
                  <span className="font-normal text-neutral-500 dark:text-neutral-400">
                    and {releases.length - 1} other release
                    {releases.length > 2 ? 's' : ''}
                  </span>
                )}
              </div>
              <time
                dateTime={releases[0].created_at}
                className="m-0 mr-2 shrink-0"
              >
                {dateFormatter.format(new Date(releases[0].created_at))}
              </time>
            </AccordionTrigger>
            <AccordionContent>
              <div
                dangerouslySetInnerHTML={{
                  __html: releases[0].body
                    ? marked.parse(releases[0].body)
                    : '',
                }}
              />
              {releases.length > 1 && (
                <>
                  <h4>Other releases</h4>
                  <ul>
                    {releases.slice(1).map((release) => (
                      <li key={release.id}>
                        <a href={release.html_url}>{release.name}</a>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
};
