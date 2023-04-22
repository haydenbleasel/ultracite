import { ReactNode } from 'react'
import { Octokit } from '@octokit/rest';
import { article as Article } from '../components/mdx';
import { marked } from 'marked';

const octokit = new Octokit();

const Page = async (): Promise<ReactNode> => {
  const releases = await octokit.rest.repos.listReleases({
    owner: 'beskar-co',
    repo: 'harmony',
    per_page: 100,
  });

  return releases.data.map((release) => (
    <Article id={release.id} date={release.created_at} title={release.name} key={release.id}>
      <h2>{release.name}</h2>
      {release.body && (
        <div dangerouslySetInnerHTML={{ __html: marked.parse(release.body) }} />
      )}
      </Article>
  ));
};

export default Page;