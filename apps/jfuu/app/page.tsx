export default function Home() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-20">
      {/* Hero */}
      <section className="mb-20">
        <h1 className="mb-6 font-semibold text-5xl tracking-tight">
          Just Fucking Use Ultracite
        </h1>
        <p className="text-muted-foreground text-xl leading-relaxed">
          Stop wasting hours configuring your linting tools. Whether you use
          ESLint, Biome, or Oxlint—Ultracite gives you battle-tested presets so
          you can get back to actually building things.
        </p>
      </section>

      {/* Stats */}
      <section className="mb-20">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="rounded-lg bg-sidebar p-6">
            <p className="mb-1 font-semibold text-3xl text-white tracking-tight">
              300+
            </p>
            <p className="text-muted-foreground text-sm">Linting rules</p>
          </div>
          <div className="rounded-lg bg-sidebar p-6">
            <p className="mb-1 font-semibold text-3xl text-white tracking-tight">
              2
            </p>
            <p className="text-muted-foreground text-sm">Dependencies</p>
          </div>
          <div className="rounded-lg bg-sidebar p-6">
            <p className="mb-1 font-semibold text-3xl text-white tracking-tight">
              0
            </p>
            <p className="text-muted-foreground text-sm">Fucks to give</p>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="mb-16">
        <h2 className="mb-4 font-semibold text-2xl">
          Your linting setup is a disaster
        </h2>
        <p className="mb-4 text-muted-foreground leading-relaxed">
          Be honest with yourself. Your current setup probably looks like this:
        </p>
        <ul className="mb-4 list-inside list-disc space-y-2 text-muted-foreground">
          <li>
            Config files with 200+ lines of rules you copied from Stack Overflow
          </li>
          <li>
            Formatter and linter rules that constantly conflict with each other
          </li>
          <li>
            Hours spent researching which rules to enable and which to ignore
          </li>
          <li>
            A <code className="text-zinc-200">lint-staged</code> config that
            breaks every other commit
          </li>
          <li>
            Rules that your AI assistant ignores because it has no idea they
            exist
          </li>
        </ul>
        <p className="text-muted-foreground leading-relaxed">
          And the worst part? Every new project means doing this shit all over
          again.
        </p>
      </section>

      {/* The Graveyard */}
      <section className="mb-16">
        <h2 className="mb-4 font-semibold text-2xl">The Graveyard</h2>
        <p className="mb-4 text-muted-foreground leading-relaxed">
          Here lies everything you get to delete. May they rest in peace.
        </p>
        <div className="rounded-lg bg-sidebar p-4 font-mono text-sm">
          <div className="space-y-1">
            <p className="text-red-400 line-through">.eslintrc.js</p>
            <p className="text-red-400 line-through">.eslintignore</p>
            <p className="text-red-400 line-through">.prettierignore</p>
            <p className="text-red-400 line-through">.editorconfig</p>
            <p className="text-red-400 line-through">eslint-config-prettier</p>
            <p className="text-red-400 line-through">eslint-plugin-import</p>
            <p className="text-red-400 line-through">eslint-plugin-react</p>
            <p className="text-red-400 line-through">
              eslint-plugin-react-hooks
            </p>
            <p className="text-red-400 line-through">
              @typescript-eslint/parser
            </p>
            <p className="text-red-400 line-through">
              @typescript-eslint/eslint-plugin
            </p>
            <p className="mt-2 text-muted-foreground">
              ...and 47 other packages you forgot you installed
            </p>
          </div>
        </div>
      </section>

      {/* What is Ultracite */}
      <section className="mb-16">
        <h2 className="mb-4 font-semibold text-2xl">
          What the fuck is Ultracite?
        </h2>
        <p className="mb-4 text-muted-foreground leading-relaxed">
          Ultracite is a collection of zero-config presets for your favorite
          linting tools. Just pick your provider and be done with it.
        </p>
        <div className="mb-4 space-y-3">
          <div className="rounded-lg bg-sidebar p-4">
            <code className="text-green-400 text-sm">npx ultracite init</code>
          </div>
        </div>
        <p className="text-muted-foreground leading-relaxed">
          Done. You now have hundreds of battle-tested linting rules, a
          formatter that doesn't fight your linter, and your AI assistant
          actually knows about your code style.
        </p>
      </section>

      {/* Social Proof */}
      <section className="mb-16">
        <h2 className="mb-4 font-semibold text-2xl">
          Smart people who stopped fucking around
        </h2>
        <p className="mb-6 text-muted-foreground leading-relaxed">
          These companies decided life's too short for config files.
        </p>
        <div className="grid grid-cols-3 gap-4 text-center text-muted-foreground text-sm sm:grid-cols-5">
          <div className="rounded-lg bg-sidebar p-3">Vercel</div>
          <div className="rounded-lg bg-sidebar p-3">Adobe</div>
          <div className="rounded-lg bg-sidebar p-3">Clerk</div>
          <div className="rounded-lg bg-sidebar p-3">Tencent</div>
          <div className="rounded-lg bg-sidebar p-3">Workday</div>
          <div className="rounded-lg bg-sidebar p-3">ElevenLabs</div>
          <div className="rounded-lg bg-sidebar p-3">Axiom</div>
          <div className="rounded-lg bg-sidebar p-3">Redpanda</div>
          <div className="rounded-lg bg-sidebar p-3">Arcade</div>
          <div className="rounded-lg bg-sidebar p-3">Magic UI</div>
        </div>
        <p className="mt-4 text-balance text-muted-foreground text-sm">
          Plus the Alan Turing Institute, the French Government, and the US
          Department of Veterans Affairs. Yes, really.
        </p>
      </section>

      {/* Benefits */}
      <section className="mb-16">
        <h2 className="mb-6 font-semibold text-2xl">Why it's fucking great</h2>
        <div className="space-y-6">
          <div>
            <h3 className="mb-2 font-medium text-lg text-zinc-200">
              Use whatever tools you want
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              Love ESLint's ecosystem? Use it. Want Biome's speed? Go for it.
              Excited about Oxlint? We got you. Ultracite doesn't care—it just
              gives you great defaults for all of them.
            </p>
          </div>
          <div>
            <h3 className="mb-2 font-medium text-lg text-zinc-200">
              Your AI actually listens
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              Ultracite generates rule files for Cursor, Claude Code, Windsurf,
              GitHub Copilot, and more. So when you ask your AI to write code,
              it follows <span className="italic">your</span> rules instead of
              making up its own bullshit.
            </p>
          </div>
          <div>
            <h3 className="mb-2 font-medium text-lg text-zinc-200">
              Hundreds of rules, zero research
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              We already figured out which rules matter. Type safety,
              accessibility, performance, security—it's all there. You don't
              need to read through 500 rule descriptions to build a good config.
            </p>
          </div>
          <div>
            <h3 className="mb-2 font-medium text-lg text-zinc-200">
              Zero config, maximum opinions
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              Stop bikeshedding about tabs vs spaces or semicolons. Ultracite
              already decided for you. You're welcome.
            </p>
          </div>
          <div>
            <h3 className="mb-2 font-medium text-lg text-zinc-200">
              Works with everything
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              Next.js, React, Vue, Svelte, Astro, Remix—it doesn't matter.
              Ultracite has framework-specific presets for all of them. Just
              pick yours and go.
            </p>
          </div>
        </div>
      </section>

      {/* What Ultracite Decides */}
      <section className="mb-16">
        <h2 className="mb-4 font-semibold text-2xl">
          What Ultracite decides for you
        </h2>
        <p className="mb-4 text-muted-foreground leading-relaxed">
          No more arguments. No more "let's discuss this in the next sprint."
          Here's what you're getting:
        </p>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex justify-between rounded-lg bg-sidebar p-3">
            <span className="text-muted-foreground">Indentation</span>
            <span className="text-zinc-200">2 spaces</span>
          </div>
          <div className="flex justify-between rounded-lg bg-sidebar p-3">
            <span className="text-muted-foreground">Semicolons</span>
            <span className="text-zinc-200">Always</span>
          </div>
          <div className="flex justify-between rounded-lg bg-sidebar p-3">
            <span className="text-muted-foreground">Quotes</span>
            <span className="text-zinc-200">Single</span>
          </div>
          <div className="flex justify-between rounded-lg bg-sidebar p-3">
            <span className="text-muted-foreground">Line width</span>
            <span className="text-zinc-200">80 chars</span>
          </div>
          <div className="flex justify-between rounded-lg bg-sidebar p-3">
            <span className="text-muted-foreground">Trailing commas</span>
            <span className="text-zinc-200">All</span>
          </div>
          <div className="flex justify-between rounded-lg bg-sidebar p-3">
            <span className="text-muted-foreground">Line endings</span>
            <span className="text-zinc-200">LF</span>
          </div>
        </div>
        <p className="mt-4 text-muted-foreground text-sm">
          Don't like it? Too bad. (Just kidding, you can override anything. But
          you won't.)
        </p>
      </section>

      {/* Rule Categories */}
      <section className="mb-16">
        <h2 className="mb-4 font-semibold text-2xl">
          Rules for everything you forgot to care about
        </h2>
        <p className="mb-4 text-muted-foreground leading-relaxed">
          Ultracite doesn't just format your code. It catches bugs, improves
          accessibility, and stops you from shipping garbage.
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-lg bg-sidebar p-4">
            <p className="mb-1 font-medium text-zinc-200">Accessibility</p>
            <p className="text-muted-foreground text-sm">
              Stop excluding users. Add alt text.
            </p>
          </div>
          <div className="rounded-lg bg-sidebar p-4">
            <p className="mb-1 font-medium text-zinc-200">Security</p>
            <p className="text-muted-foreground text-sm">
              No eval(), no dangerouslySetInnerHTML.
            </p>
          </div>
          <div className="rounded-lg bg-sidebar p-4">
            <p className="mb-1 font-medium text-zinc-200">Performance</p>
            <p className="text-muted-foreground text-sm">
              Catch expensive re-renders early.
            </p>
          </div>
          <div className="rounded-lg bg-sidebar p-4">
            <p className="mb-1 font-medium text-zinc-200">Correctness</p>
            <p className="text-muted-foreground text-sm">
              Find bugs before your users do.
            </p>
          </div>
          <div className="rounded-lg bg-sidebar p-4">
            <p className="mb-1 font-medium text-zinc-200">Complexity</p>
            <p className="text-muted-foreground text-sm">
              Keep functions readable. No 500-line monsters.
            </p>
          </div>
          <div className="rounded-lg bg-sidebar p-4">
            <p className="mb-1 font-medium text-zinc-200">Style</p>
            <p className="text-muted-foreground text-sm">
              Consistent code across your whole team.
            </p>
          </div>
        </div>
      </section>

      {/* AI Integration */}
      <section className="mb-16">
        <h2 className="mb-4 font-semibold text-2xl">
          Your AI assistant is finally useful
        </h2>
        <p className="mb-4 text-muted-foreground leading-relaxed">
          Ever noticed how Copilot ignores your linting rules? That's because it
          doesn't know they exist. Ultracite generates rule files that your AI
          can actually read.
        </p>
        <div className="mb-4 space-y-3">
          <div className="flex items-center gap-3 rounded-lg bg-sidebar p-4">
            <div className="h-2 w-2 rounded-full bg-green-400" />
            <span className="text-zinc-300">Cursor</span>
            <span className="ml-auto text-muted-foreground text-sm">
              .cursor/rules/ultracite.mdc
            </span>
          </div>
          <div className="flex items-center gap-3 rounded-lg bg-sidebar p-4">
            <div className="h-2 w-2 rounded-full bg-green-400" />
            <span className="text-zinc-300">Claude Code</span>
            <span className="ml-auto text-muted-foreground text-sm">
              CLAUDE.md
            </span>
          </div>
          <div className="flex items-center gap-3 rounded-lg bg-sidebar p-4">
            <div className="h-2 w-2 rounded-full bg-green-400" />
            <span className="text-zinc-300">GitHub Copilot</span>
            <span className="ml-auto text-muted-foreground text-sm">
              .github/copilot-instructions.md
            </span>
          </div>
          <div className="flex items-center gap-3 rounded-lg bg-sidebar p-4">
            <div className="h-2 w-2 rounded-full bg-green-400" />
            <span className="text-zinc-300">Windsurf</span>
            <span className="ml-auto text-muted-foreground text-sm">
              .windsurfrules
            </span>
          </div>
        </div>
        <p className="text-muted-foreground text-sm">
          Now when you ask AI to write code, it writes code{" "}
          <span className="italic">your way</span>. Revolutionary, I know.
        </p>
      </section>

      {/* Comparison Table */}
      <section className="mb-16">
        <h2 className="mb-4 font-semibold text-2xl">Pick your weapon</h2>
        <p className="mb-4 text-muted-foreground leading-relaxed">
          Can't decide which linter to use? Here's the honest breakdown:
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-zinc-800 border-b">
                <th className="py-3 text-left font-medium text-muted-foreground" />
                <th className="py-3 text-left font-medium text-muted-foreground">
                  ESLint
                </th>
                <th className="py-3 text-left font-medium text-muted-foreground">
                  Biome
                </th>
                <th className="py-3 text-left font-medium text-muted-foreground">
                  Oxlint
                </th>
              </tr>
            </thead>
            <tbody className="text-zinc-300">
              <tr className="border-zinc-800/50 border-b">
                <td className="py-3 text-muted-foreground">Speed</td>
                <td className="py-3">Slow</td>
                <td className="py-3">Fast as fuck</td>
                <td className="py-3">Fast as fuck</td>
              </tr>
              <tr className="border-zinc-800/50 border-b">
                <td className="py-3 text-muted-foreground">Ecosystem</td>
                <td className="py-3">Huge</td>
                <td className="py-3">Growing</td>
                <td className="py-3">New</td>
              </tr>
              <tr className="border-zinc-800/50 border-b">
                <td className="py-3 text-muted-foreground">Formatter</td>
                <td className="py-3">Prettier</td>
                <td className="py-3">Built-in</td>
                <td className="py-3">Oxfmt</td>
              </tr>
              <tr className="border-zinc-800/50 border-b">
                <td className="py-3 text-muted-foreground">Config UX</td>
                <td className="py-3">Pain</td>
                <td className="py-3">Nice</td>
                <td className="py-3">Nice</td>
              </tr>
              <tr>
                <td className="py-3 text-muted-foreground">Maturity</td>
                <td className="py-3">Battle-tested</td>
                <td className="py-3">Production-ready</td>
                <td className="py-3">Getting there</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-muted-foreground text-sm">
          TL;DR: ESLint if you need specific plugins. Biome if you want speed
          and simplicity. Oxlint if you like living on the edge.
        </p>
      </section>

      {/* Migration */}
      <section className="mb-16">
        <h2 className="mb-4 font-semibold text-2xl">Already have a mess?</h2>
        <p className="mb-4 text-muted-foreground leading-relaxed">
          Migrating is easier than you think. Here's the plan:
        </p>
        <ol className="mb-4 list-inside list-decimal space-y-3 text-muted-foreground">
          <li>Delete your existing shit config</li>
          <li>
            Run{" "}
            <code className="rounded bg-sidebar px-2 py-0.5 text-green-400">
              npx ultracite init
            </code>
          </li>
          <li>
            Run{" "}
            <code className="rounded bg-sidebar px-2 py-0.5 text-green-400">
              npx ultracite fix
            </code>{" "}
            to auto-fix everything
          </li>
          <li>Commit the changes</li>
          <li>Never think about linting config again</li>
        </ol>
        <p className="text-muted-foreground text-sm">
          That's it. The whole migration takes about 5 minutes. You've spent
          longer reading this page.
        </p>
      </section>

      {/* Objections */}
      <section className="mb-16">
        <h2 className="mb-6 font-semibold text-2xl">"But what about..."</h2>
        <div className="space-y-6">
          <div>
            <h3 className="mb-2 font-medium text-lg text-zinc-200">
              "I have custom rules I need"
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              Cool. Override them. Ultracite is just a preset—you can add
              whatever rules you want on top. But you probably don't need to.
              The defaults are good.
            </p>
          </div>
          <div>
            <h3 className="mb-2 font-medium text-lg text-zinc-200">
              "I already have a setup that works"
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              Does it though? When's the last time you updated those rules? Are
              your formatter and linter still fighting? Does your AI know about
              any of it? Ultracite keeps everything in sync and up-to-date.
            </p>
          </div>
          <div>
            <h3 className="mb-2 font-medium text-lg text-zinc-200">
              "My team won't like the style choices"
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              Your team will like shipping code faster. Stop having meetings
              about formatting. Accept the defaults and move on with your lives.
            </p>
          </div>
        </div>
      </section>

      {/* Decision Flowchart */}
      <section className="mb-16">
        <h2 className="mb-4 font-semibold text-2xl">
          Should you use Ultracite?
        </h2>
        <div className="rounded-lg bg-sidebar p-6 font-mono text-sm">
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Do you write JavaScript or TypeScript?
            </p>
            <div className="ml-4 space-y-2">
              <p className="text-muted-foreground">
                ├─ <span className="text-green-400">Yes</span> → Use Ultracite
              </p>
              <p className="text-muted-foreground">
                └─ <span className="text-red-400">No</span> → Why are you even
                here?
              </p>
            </div>
            <p className="mt-4 text-muted-foreground">
              Do you enjoy configuring linters?
            </p>
            <div className="ml-4 space-y-2">
              <p className="text-muted-foreground">
                ├─ <span className="text-green-400">Yes</span> → You're lying.
                Use Ultracite.
              </p>
              <p className="text-muted-foreground">
                └─ <span className="text-red-400">No</span> → Use Ultracite
              </p>
            </div>
            <p className="mt-4 text-muted-foreground">
              Do you have better things to do?
            </p>
            <div className="ml-4 space-y-2">
              <p className="text-muted-foreground">
                ├─ <span className="text-green-400">Yes</span> → Use Ultracite
              </p>
              <p className="text-muted-foreground">
                └─ <span className="text-red-400">No</span> → That's sad. Use
                Ultracite anyway.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mb-16">
        <h2 className="mb-4 font-semibold text-2xl">Just do it</h2>
        <p className="mb-6 text-muted-foreground leading-relaxed">
          You've been thinking about fixing your linting setup for months.
          Here's your sign. Run this and pick your preferred toolchain:
        </p>
        <pre className="mb-6 overflow-x-auto rounded-lg bg-sidebar p-4 text-sm">
          <code className="text-green-400">npx ultracite init</code>
        </pre>
        <p className="mb-6 text-muted-foreground leading-relaxed">
          That's literally it. ESLint, Biome, Oxlint—whatever you pick, you'll
          get a bulletproof config in seconds. Stop overthinking. Stop
          researching. Stop comparing. Just fucking use Ultracite.
        </p>
        <a
          className="inline-flex items-center justify-center rounded-lg bg-white px-6 py-3 font-medium text-base text-zinc-950 transition-colors hover:bg-zinc-200"
          href="https://www.ultracite.ai/"
          rel="noopener noreferrer"
          target="_blank"
        >
          Learn more at ultracite.ai
        </a>
      </section>

      {/* Footer */}
      <footer className="border-zinc-800 border-t pt-8 text-muted-foreground text-sm">
        <p>
          Inspired by{" "}
          <a
            className="underline hover:text-muted-foreground"
            href="https://justfuckingusetailwind.com/"
            rel="noopener noreferrer"
            target="_blank"
          >
            justfuckingusetailwind.com
          </a>{" "}
          and{" "}
          <a
            className="underline hover:text-muted-foreground"
            href="https://justfuckingusereact.com/"
            rel="noopener noreferrer"
            target="_blank"
          >
            justfuckingusereact.com
          </a>
          .
        </p>
      </footer>
    </main>
  );
}
