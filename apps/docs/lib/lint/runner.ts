import "server-only";

import { Sandbox } from "@vercel/sandbox";
import { getInstallationOctokit } from "@/lib/github/app";

const BIOME_OUTPUT_PATTERN = /^(.+?):(\d+):(\d+)\s+([\w/]+)/m;
const FIVE_MINUTES_MS = 5 * 60 * 1000;

interface LintRunParams {
  installationId: number;
  repoFullName: string;
  defaultBranch: string;
}

interface LintRunResult {
  issuesFound: number;
  issueFixed?: string;
  prCreated: boolean;
  prNumber?: number;
  prUrl?: string;
}

export const runLintAndCreatePR = async (
  params: LintRunParams
): Promise<LintRunResult> => {
  const { installationId, repoFullName, defaultBranch } = params;
  const octokit = await getInstallationOctokit(installationId);
  const [owner, repo] = repoFullName.split("/");

  // Get installation token for GitHub auth
  const { token } = (await octokit.auth({
    type: "installation",
  })) as { token: string };

  // Create sandbox with the repo
  const sandbox = await Sandbox.create({
    source: {
      type: "git",
      url: `https://github.com/${repoFullName}`,
      username: "x-access-token",
      password: token,
      depth: 1,
    },
    timeout: FIVE_MINUTES_MS,
  });

  try {
    // Install dependencies
    await sandbox.runCommand("npm", ["install", "--legacy-peer-deps"]);

    // Run ultracite check
    const checkResult = await sandbox.runCommand("npx", [
      "ultracite",
      "check",
      "--diagnostic-level=error",
    ]);

    const checkOutput = await checkResult.output("both");
    const hasIssues = checkResult.exitCode !== 0;

    if (!hasIssues) {
      return { issuesFound: 0, prCreated: false };
    }

    const firstIssue = parseFirstIssue(checkOutput);
    if (!firstIssue) {
      return { issuesFound: 0, prCreated: false };
    }

    // Run ultracite fix
    await sandbox.runCommand("npx", ["ultracite", "fix"]);

    // Check if there are changes
    const diffResult = await sandbox.runCommand("git", ["diff", "--name-only"]);
    const diffOutput = await diffResult.stdout();

    if (!diffOutput.trim()) {
      return { issuesFound: 1, prCreated: false, issueFixed: firstIssue.rule };
    }

    // Create branch, commit, and push
    const branchName = `ultracite/fix-${firstIssue.rule.replace(/\//g, "-")}-${Date.now()}`;

    await sandbox.runCommand("git", ["checkout", "-b", branchName]);
    await sandbox.runCommand("git", [
      "config",
      "user.email",
      "ultracite@users.noreply.github.com",
    ]);
    await sandbox.runCommand("git", ["config", "user.name", "Ultracite Bot"]);
    await sandbox.runCommand("git", ["add", "-A"]);
    await sandbox.runCommand("git", [
      "commit",
      "-m",
      `fix: ${firstIssue.rule} lint issue\n\nAutomatically fixed by Ultracite`,
    ]);
    await sandbox.runCommand("git", ["push", "origin", branchName]);

    // Create PR via GitHub API
    const { data: pr } = await octokit.request(
      "POST /repos/{owner}/{repo}/pulls",
      {
        owner,
        repo,
        title: `fix: Ultracite lint fix for ${firstIssue.rule}`,
        body: `## Summary

This PR fixes a linting issue detected by Ultracite.

**Rule**: \`${firstIssue.rule}\`
**File**: \`${firstIssue.file}\`

## Changes

Automatically applied the recommended fix for the \`${firstIssue.rule}\` rule.

---

*This PR was automatically created by [Ultracite](https://ultracite.ai) using [Vercel Sandbox](https://vercel.com/docs/vercel-sandbox).*`,
        head: branchName,
        base: defaultBranch,
        headers: {
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );

    return {
      issuesFound: 1,
      issueFixed: firstIssue.rule,
      prCreated: true,
      prNumber: pr.number,
      prUrl: pr.html_url,
    };
  } finally {
    await sandbox.stop();
  }
};

const parseFirstIssue = (
  output: string
): { rule: string; file: string } | null => {
  const match = output.match(BIOME_OUTPUT_PATTERN);
  if (match) {
    return {
      file: match[1],
      rule: match[4],
    };
  }
  return null;
};
