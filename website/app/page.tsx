import { marked } from 'marked';
import { Article } from '../components/mdx';
import octokit from '../lib/octokit';
import type { ReactNode } from 'react';

const Page = async (): Promise<ReactNode> => {
  const releases = await octokit.rest.repos.listReleases({
    owner: 'haydenbleasel',
    repo: 'harmony',
    per_page: 100,
  });

  return releases.data.map((release) => (
    <Article id={release.id} date={release.created_at} key={release.id}>
      <h2>{release.name}</h2>
      {release.body ? (
        // eslint-disable-next-line react/no-danger, @typescript-eslint/naming-convention
        <div dangerouslySetInnerHTML={{ __html: marked.parse(release.body) }} />
      ) : null}
    </Article>
  ));
};

export default Page;
