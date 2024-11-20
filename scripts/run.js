#!/usr/bin/env node

const { execSync } = require('node:child_process');
const args = process.argv.slice(2);

if (args.length) {
  console.log('Usage: npx ultracite');
  process.exit(1);
}

try {
  execSync('npx biome check --write ./', {
    stdio: 'inherit',
  });
} catch (error) {
  console.error('Failed to run Ultracite:', error.message);
  process.exit(1);
}
