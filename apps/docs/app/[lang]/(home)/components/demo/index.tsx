import Image from "next/image";
import Background from "./background.jpg";

const output = `./app/(authenticated)/welcome/components/welcome-demo.tsx:205:19 lint/complexity/noExcessiveCognitiveComplexity ━━━━━━━━━━

  ⚠ Excessive complexity of 20 detected (max: 15).
  
    204 │   const handleNodesChange = useCallback(() => {
  > 205 │     setTimeout(() => {
        │                   ^^^
    206 │       const newEdges = getEdges();
    207 │       const newNodes = getNodes();
  
  ℹ Please refactor this function to reduce its complexity score from 20 to the max allowed complexity 15.
  

./scripts/skip-ci.js:1:30 lint/style/useNodejsImportProtocol  FIXABLE  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ✖ A Node.js builtin module should be imported with the node: protocol.
  
  > 1 │ const { execSync } = require('child_process');
      │                              ^^^^^^^^^^^^^^^
    2 │ 
    3 │ const commitMessage = execSync('git log -1 --pretty=%B').toString().trim();
  
  ℹ Using the node: protocol is more explicit and signals that the imported module belongs to Node.js.
  
  ℹ Unsafe fix: Add the node: protocol.
  
     1    │ - const·{·execSync·}·=·require('child_process');
        1 │ + const·{·execSync·}·=·require('node:child_process');
     2  2 │   
     3  3 │   const commitMessage = execSync('git log -1 --pretty=%B').toString().trim();
  

./scripts/skip-ci.js:6:3 lint/suspicious/noConsole  FIXABLE  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ⚠ Don't use console.
  
    5 │ if (commitMessage.includes('[skip ci]')) {
  > 6 │   console.log('Skipping build due to [skip ci] in commit message.');
      │   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    7 │   process.exit(0); // this causes Vercel to skip the build
    8 │ }
  
  ℹ The use of console is often reserved for debugging.
  
  ℹ Unsafe fix: Remove console.
  
     4  4 │   
     5  5 │   if (commitMessage.includes('[skip ci]')) {
     6    │ - ··console.log('Skipping·build·due·to·[skip·ci]·in·commit·message.');
     7  6 │     process.exit(0); // this causes Vercel to skip the build
     8  7 │   }
  

./scripts/skip-ci.js:6:3 lint/suspicious/noConsoleLog  FIXABLE  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ⚠ Don't use console.log
  
    5 │ if (commitMessage.includes('[skip ci]')) {
  > 6 │   console.log('Skipping build due to [skip ci] in commit message.');
      │   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    7 │   process.exit(0); // this causes Vercel to skip the build
    8 │ }
  
  ℹ console.log is usually a tool for debugging and you don't want to have that in production.
  
  ℹ If it is not for debugging purpose then using console.info might be more appropriate.
  
  ℹ Unsafe fix: Remove console.log
  
     4  4 │   
     5  5 │   if (commitMessage.includes('[skip ci]')) {
     6    │ - ··console.log('Skipping·build·due·to·[skip·ci]·in·commit·message.');
     7  6 │     process.exit(0); // this causes Vercel to skip the build
     8  7 │   }
  

./app/actions/tweet/get.ts:29:12 lint/correctness/noUnusedVariables  FIXABLE  ━━━━━━━━━━━━━━━━━━━━━━

  ⚠ This variable is unused.
  
    27 │       date: tweet.created_at,
    28 │     };
  > 29 │   } catch (error) {
       │            ^^^^^
    30 │     return {
    31 │       error: 'Error fetching tweet',
  
  ℹ Unused variables usually are result of incomplete refactoring, typos and other source of bugs.
  
  ℹ Unsafe fix: If this is intentional, prepend error with an underscore.
  
    27 27 │         date: tweet.created_at,
    28 28 │       };
    29    │ - ··}·catch·(error)·{
       29 │ + ··}·catch·(_error)·{
    30 30 │       return {
    31 31 │         error: 'Error fetching tweet',
  

./app/api/code/route.ts:77:7 lint/suspicious/noConsole  FIXABLE  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ⚠ Don't use console.
  
    75 │     messages: convertToModelMessages(messages),
    76 │     onError: (error) => {
  > 77 │       console.error(error);
       │       ^^^^^^^^^^^^^^^^^^^^^
    78 │     },
    79 │     onFinish: async ({ usage }) => {
  
  ℹ The use of console is often reserved for debugging.
  
  ℹ Unsafe fix: Remove console.
  
    75 75 │       messages: convertToModelMessages(messages),
    76 76 │       onError: (error) => {
    77    │ - ······console.error(error);
    78 77 │       },
    79 78 │       onFinish: async ({ usage }) => {
  

./app/api/webhooks/stripe/route.ts:10:23 lint/complexity/noExcessiveCognitiveComplexity ━━━━━━━━━━━━

  ⚠ Excessive complexity of 20 detected (max: 15).
  
     8 │ import type Stripe from 'stripe';
     9 │ 
  > 10 │ export async function POST(req: Request) {
       │                       ^^^^
    11 │   const body = await req.text();
    12 │   const signature = req.headers.get('stripe-signature') as string;
  
  ℹ Please refactor this function to reduce its complexity score from 20 to the max allowed complexity 15.
  

./app/api/webhooks/stripe/route.ts:105:9 lint/suspicious/noConsole  FIXABLE  ━━━━━━━━━━━━━━━━━━━━━━━

  ⚠ Don't use console.
  
    103 │       }
    104 │       default:
  > 105 │         console.log(\`Unhandled event type \${event.type}\`);
        │         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    106 │         break;
    107 │     }
  
  ℹ The use of console is often reserved for debugging.
  
  ℹ Unsafe fix: Remove console.
  
    103 103 │         }
    104 104 │         default:
    105     │ - ········console.log(\`Unhandled·event·type·\${event.type}\`);
    106 105 │           break;
    107 106 │       }
  

./app/api/webhooks/stripe/route.ts:105:9 lint/suspicious/noConsoleLog  FIXABLE  ━━━━━━━━━━━━━━━━━━━━

  ⚠ Don't use console.log
  
    103 │       }
    104 │       default:
  > 105 │         console.log(\`Unhandled event type \${event.type}\`);
        │         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    106 │         break;
    107 │     }
  
  ℹ console.log is usually a tool for debugging and you don't want to have that in production.
  
  ℹ If it is not for debugging purpose then using console.info might be more appropriate.
  
  ℹ Unsafe fix: Remove console.log
  
    103 103 │         }
    104 104 │         default:
    105     │ - ········console.log(\`Unhandled·event·type·\${event.type}\`);
    106 105 │           break;
    107 106 │       }

Skipped 9 suggested fixes.
Checked 174 files in 111ms. Fixed 6 files.
Found 3 errors.
Found 17 warnings.`;

export const Demo = () => (
  <div className="relative isolate overflow-hidden rounded-3xl">
    <Image
      alt=""
      className="absolute top-0 left-0 size-full object-cover"
      height={1000}
      src={Background}
      width={1000}
    />
    <div className="size-full px-16 pt-16">
      <div className="max-h-128 overflow-y-auto rounded-x-2xl rounded-t-2xl bg-black/80 p-8 backdrop-blur-sm">
        <pre className="font-mono text-sm">
          <code>
            <span className="text-white">npx ultracite@latest fix</span>
            <br />
            <br />
            <br />
            <span className="text-white">{output}</span>
          </code>
        </pre>
      </div>
    </div>
  </div>
);
