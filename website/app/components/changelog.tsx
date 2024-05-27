/* eslint-disable @typescript-eslint/naming-convention, react/no-danger */

import { marked } from 'marked';
import { getChangelog } from '@/lib/octokit';
import { dateFormatter } from '@/lib/date';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import type { ReactElement } from 'react';

export const Changelog = async (): Promise<ReactElement> => {
  const changelog = await getChangelog();

  return (
    <div className="relative md:overflow-y-auto md:h-screen py-20 px-4">
      <Accordion
        type="single"
        className="prose prose-sm prose-neutral max-w-lg mx-auto"
        defaultValue={String(changelog.data[0].id)}
        collapsible
      >
        {changelog.data.map((release) => (
          <AccordionItem
            value={String(release.id)}
            key={release.id}
            className="[&>h3]:m-0"
          >
            <AccordionTrigger>
              <p className="m-0 flex-1 text-left">{release.name}</p>
              <time dateTime={release.created_at} className="shrink-0 m-0 mr-2">
                {dateFormatter.format(new Date(release.created_at))}
              </time>
            </AccordionTrigger>
            <AccordionContent>
              <div
                dangerouslySetInnerHTML={{
                  __html: release.body ? marked.parse(release.body) : '',
                }}
              />
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
};
