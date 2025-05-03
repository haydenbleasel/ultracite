import { Octokit } from 'octokit';
import type { ReactElement } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../components/ui/accordion';

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

export const Releases = async (): Promise<ReactElement> => {
  const releases = await octokit.paginate(
    'GET /repos/{owner}/{repo}/releases',
    {
      owner: 'haydenbleasel',
      repo: 'ultracite',
    }
  );

  const releasesByDay = releases.reduce<Record<string, typeof releases>>(
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
    <Accordion
      type="single"
      defaultValue={Object.keys(releasesByDay).at(0)}
      collapsible
    >
      {Object.entries(releasesByDay).map(([date, releases]) => (
        <AccordionItem value={date} key={date} className="[&>h3]:m-0">
          <AccordionTrigger className="not-prose">
            <div className="flex flex-1 items-center gap-1 text-left">
              <p className="m-0">{releases.at(0)?.name}</p>
              {releases.length > 1 && (
                <span className="font-normal text-neutral-500 dark:text-neutral-400">
                  and {releases.length - 1} other release
                  {releases.length > 2 ? 's' : ''}
                </span>
              )}
            </div>
            <time
              dateTime={releases.at(0)?.created_at}
              className="m-0 mr-2 shrink-0"
            >
              {new Intl.DateTimeFormat('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              }).format(new Date(releases.at(0)?.created_at ?? ''))}
            </time>
          </AccordionTrigger>
          <AccordionContent>
            <ReactMarkdown>{releases.at(0)?.body ?? ''}</ReactMarkdown>
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
  );
};
