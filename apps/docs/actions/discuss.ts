import { App, type Octokit } from "octokit";
import type { ActionResponse, Feedback } from "@/components/feedback";
import { env } from "@/env";

export const repo = "ultracite";
export const owner = "haydenbleasel";
export const DocsCategory = "Docs Feedback";

let instance: Octokit | undefined;

async function getOctokit(): Promise<Octokit> {
  if (instance) {
    return instance;
  }

  const appId = env.GITHUB_APP_ID;
  const privateKey = env.GITHUB_APP_PRIVATE_KEY;

  if (!(appId && privateKey)) {
    throw new Error(
      "No GitHub keys provided for Github app, docs feedback feature will not work."
    );
  }

  const app = new App({
    appId,
    privateKey,
  });

  const { data } = await app.octokit.request(
    "GET /repos/{owner}/{repo}/installation",
    {
      owner,
      repo,
      headers: {
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }
  );

  instance = await app.getInstallationOctokit(data.id);
  return instance;
}

type RepositoryInfo = {
  id: string;
  discussionCategories: {
    nodes: {
      id: string;
      name: string;
    }[];
  };
};

let cachedDestination: RepositoryInfo | undefined;
async function getFeedbackDestination() {
  if (cachedDestination) {
    return cachedDestination;
  }

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

  cachedDestination = repository;

  return cachedDestination;
}

export const discuss = async (
  url: string,
  feedback: Feedback
): Promise<ActionResponse> => {
  "use server";
  const octokit = await getOctokit();
  const destination = await getFeedbackDestination();

  if (!(octokit && destination)) {
    throw new Error("GitHub comment integration is not configured.");
  }

  const category = destination.discussionCategories.nodes.find(
    ({ name }) => name === DocsCategory
  );

  if (!category) {
    throw new Error(
      `Please create a "${DocsCategory}" category in GitHub Discussion`
    );
  }

  const title = `Feedback for ${url}`;
  const body = `[${feedback.opinion}] ${feedback.message}\n\n> Forwarded from user feedback.`;

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

    discussion = result.discussion;
  }

  return {
    githubUrl: discussion.url,
  };
};
