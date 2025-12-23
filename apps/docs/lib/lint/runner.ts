import "server-only";

import { execSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getInstallationOctokit } from "@/lib/github/app";

const BIOME_OUTPUT_PATTERN = /^(.+?):(\d+):(\d+)\s+([\w/]+)/m;

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

  const tempDir = mkdtempSync(join(tmpdir(), "ultracite-"));

  try {
    const { token } = (await octokit.auth({
      type: "installation",
    })) as { token: string };
    const cloneUrl = `https://x-access-token:${token}@github.com/${repoFullName}.git`;

    execSync(`git clone --depth 1 ${cloneUrl} ${tempDir}`, {
      stdio: "pipe",
    });

    let checkOutput: string;
    let hasIssues = false;

    try {
      checkOutput = execSync("npx ultracite check --diagnostic-level=error", {
        cwd: tempDir,
        encoding: "utf-8",
        stdio: "pipe",
      });
    } catch (error) {
      hasIssues = true;
      const execError = error as { stdout?: string; message?: string };
      checkOutput = execError.stdout ?? execError.message ?? "";
    }

    if (!hasIssues) {
      return { issuesFound: 0, prCreated: false };
    }

    const firstIssue = parseFirstIssue(checkOutput);
    if (!firstIssue) {
      return { issuesFound: 0, prCreated: false };
    }

    execSync("npx ultracite fix", {
      cwd: tempDir,
      stdio: "pipe",
    });

    const diffOutput = execSync("git diff --name-only", {
      cwd: tempDir,
      encoding: "utf-8",
    });

    if (!diffOutput.trim()) {
      return { issuesFound: 1, prCreated: false, issueFixed: firstIssue.rule };
    }

    const branchName = `ultracite/fix-${firstIssue.rule.replace(/\//g, "-")}-${Date.now()}`;
    execSync(`git checkout -b ${branchName}`, {
      cwd: tempDir,
      stdio: "pipe",
    });

    execSync('git config user.email "ultracite@users.noreply.github.com"', {
      cwd: tempDir,
    });
    execSync('git config user.name "Ultracite Bot"', { cwd: tempDir });
    execSync("git add -A", { cwd: tempDir });
    execSync(
      `git commit -m "fix: ${firstIssue.rule} lint issue

Automatically fixed by Ultracite"`,
      { cwd: tempDir }
    );

    execSync(`git push origin ${branchName}`, {
      cwd: tempDir,
      stdio: "pipe",
    });

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

*This PR was automatically created by [Ultracite](https://ultracite.ai).*`,
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
    rmSync(tempDir, { recursive: true, force: true });
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
