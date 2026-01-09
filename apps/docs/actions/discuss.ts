"use server";

import { App, type Octokit } from "octokit";

import type {
  ActionResponse,
  Feedback,
} from "@/components/ultracite/feedback";
import { env } from "@/lib/env";

const repo = "ultracite";
const owner = "haydenbleasel";
const DocsCategory = "Documentation";

const getOctokit = async (): Promise<Octokit> => {
  const appId = env.GITHUB_APP_ID;
  const privateKey = env.GITHUB_APP_PRIVATE_KEY.replaceAll('\\n', "\n");
  const app = new App({ appId, privateKey });

  const { data } = await app.octokit.request(
    "GET /repos/{owner}/{repo}/installation",
    {
      headers: {
        "X-GitHub-Api-Version": "2022-11-28",
      },
      owner,
      repo,
    }
  );

  return await app.getInstallationOctokit(data.id);
};

interface RepositoryInfo {
  id: string;
  discussionCategories: {
    nodes: {
      id: string;
      name: string;
    }[];
  };
}

const getFeedbackDestination = async () => {
  const octokit = await getOctokit();

  const {
    repository,
  }: {
    repository: RepositoryInfo;
  } = await octokit.graphql(`
  query {
    repository(owner: "${owner}", name: "${repo}") {
      id
      discussionCategories(first: 25) {
        nodes { id name }
      }
    }
  }
`);

  return repository;
};

export const discuss = async (
  url: string,
  feedback: Feedback
): Promise<ActionResponse> => {
  const octokit = await getOctokit();
  const destination = await getFeedbackDestination();
  const category = destination.discussionCategories.nodes.find(
    ({ name }) => name === DocsCategory
  );

  if (!category) {
    throw new Error(
      `Please create a "${DocsCategory}" category in GitHub Discussion`
    );
  }

  const title = `Feedback for ${url}`;
  const emoji = feedback.opinion === "good" ? "👍" : "👎";
  const body = `${emoji} ${feedback.message}\n\n> Forwarded from user feedback.`;

  let {
    search: {
      nodes: [discussion],
    },
  }: {
    search: {
      nodes: { id: string; url: string }[];
    };
  } = await octokit.graphql(`
          query {
            search(type: DISCUSSION, query: ${JSON.stringify(`${title} in:title repo:${owner}/${repo} author:@me`)}, first: 1) {
              nodes {
                ... on Discussion { id, url }
              }
            }
          }`);

  if (discussion) {
    await octokit.graphql(`
            mutation {
              addDiscussionComment(input: { body: ${JSON.stringify(body)}, discussionId: "${discussion.id}" }) {
                comment { id }
              }
            }`);
  } else {
    const result: {
      discussion: { id: string; url: string };
    } = await octokit.graphql(`
            mutation {
              createDiscussion(input: { repositoryId: "${destination.id}", categoryId: "${category.id}", body: ${JSON.stringify(body)}, title: ${JSON.stringify(title)} }) {
                discussion { id, url }
              }
            }`);

    ({ discussion } = result);
  }

  return {
    githubUrl: discussion.url,
  };
};
