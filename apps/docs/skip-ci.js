const { execSync } = require("node:child_process");

const commitMessage = execSync("git log -1 --pretty=%B").toString().trim();

if (commitMessage.includes("[skip ci]")) {
  process.exit(0); // this causes Vercel to skip the build
}

process.exit(1); // continue with build
