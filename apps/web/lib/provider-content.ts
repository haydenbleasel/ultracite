import { docsUrl } from "@repo/data/consts";
import type { ProviderId } from "@repo/data/providers";

export interface ProviderPageFaq {
  answer: string;
  question: string;
}

export interface ProviderPageResource {
  description: string;
  href: string;
  title: string;
}

export interface ProviderPageSection {
  icon: string;
  paragraphs: string[];
  title: string;
}

export interface ProviderPageContent {
  benefitsDescription: string;
  benefitsTitle: string;
  configDescription: string;
  configTitle: string;
  faqs: ProviderPageFaq[];
  faqsDescription: string;
  faqsTitle: string;
  heroDescription: string;
  heroTitle: string;
  metadataDescription: string;
  metadataTitle: string;
  resources: ProviderPageResource[];
  resourcesDescription: string;
  resourcesTitle: string;
  sections: ProviderPageSection[];
  sectionsDescription: string;
  sectionsTitle: string;
  videosDescription?: string;
  videosTitle?: string;
}

const providerContent: Record<ProviderId, ProviderPageContent> = {
  biome: {
    benefitsDescription:
      "Biome stays appealing when you want one tool to format, lint, and organize imports without inheriting the plugin management overhead of the ESLint ecosystem.",
    benefitsTitle: "Reasons teams standardize on Biome through Ultracite",
    configDescription:
      "The generated `biome.jsonc` stays compact because Ultracite carries the defaults. You extend the presets you need, keep any deliberate overrides, and still preserve the single-binary developer experience.",
    configTitle: "What changes in your Biome setup",
    faqs: [
      {
        answer:
          "No. Ultracite's Biome flow keeps the same single-binary model. You extend Ultracite presets from `biome.jsonc`, then keep any local rule overrides that are truly project-specific.",
        question: "Will Ultracite make my Biome setup more complex?",
      },
      {
        answer:
          "Yes. The migration guide is designed around preserving your existing configuration while moving the baseline rules into Ultracite so new projects stay consistent.",
        question: "Can I keep custom Biome rules after migrating?",
      },
      {
        answer:
          "Choose Biome when you want one fast tool for linting and formatting with fewer moving parts. Choose ESLint when you need maximum plugin breadth, ecosystem compatibility, or highly specialized rules.",
        question: "When should I keep Biome instead of moving back to ESLint?",
      },
      {
        answer:
          "Biome and Oxlint are both fast, but Biome is the better fit if you want formatting and linting bundled together. Oxlint is stronger when you want lint speed first and are comfortable pairing it with a separate formatter.",
        question: "How do Biome and Oxlint differ inside Ultracite?",
      },
      {
        answer:
          "Yes. Ultracite adds the editor integration and migration defaults that help AI-assisted editors behave consistently, while Biome continues to provide the actual diagnostics and formatting behavior.",
        question: "Does this still work well with AI-powered editors?",
      },
    ],
    faqsDescription:
      "These are the common questions teams ask when they already like Biome and want to know what Ultracite changes.",
    faqsTitle: "Biome migration FAQ",
    heroDescription:
      "Ultracite keeps the fast formatter-and-linter workflow that made you choose Biome in the first place, then adds a stronger default baseline for editor setup, team consistency, and repeatable project bootstrapping.",
    heroTitle: "Standardize your Biome workflow with Ultracite",
    metadataDescription:
      "Migrate from standalone Biome to Ultracite while keeping the single-binary workflow. Learn what Ultracite adds on top of Biome, how the config changes, and when Biome is still the right fit.",
    metadataTitle: "Migrate from Biome to Ultracite",
    resources: [
      {
        description:
          "Step-by-step migration guidance for moving an existing `biome.jsonc` project onto Ultracite.",
        href: `${docsUrl}/migrate/biome`,
        title: "Read the Biome migration guide",
      },
      {
        description:
          "Provider reference docs covering rule categories, formatter defaults, and extension setup for Biome.",
        href: `${docsUrl}/provider/biome`,
        title: "Review the Biome provider docs",
      },
    ],
    resourcesDescription:
      "Use the migration guide when you are rolling this out and the provider docs when you need deeper reference on rules, defaults, and editor setup.",
    resourcesTitle: "Related Biome resources",
    sections: [
      {
        icon: "Layers",
        paragraphs: [
          "Biome is the strongest default when you want formatting and linting to feel like one opinionated system instead of a chain of plugins and companion tools.",
          "That makes it especially attractive for teams that value fast onboarding, predictable editor behavior, and fewer places for configuration drift to appear.",
        ],
        title: "Choose Biome for a simpler team standard",
      },
      {
        icon: "ShieldCheck",
        paragraphs: [
          "Ultracite does not try to replace Biome's core value. It packages a stricter shared baseline, editor defaults, and migration ergonomics so multiple projects can converge on the same expectations.",
          "The benefit is not a different linter. The benefit is a repeatable way to apply Biome across teams without re-deciding every rule and editor behavior from scratch.",
        ],
        title: "What Ultracite adds to the Biome workflow",
      },
      {
        icon: "Scale",
        paragraphs: [
          "Biome still trades away some of the plugin variety and framework-specific edge coverage that make ESLint attractive for mature or unusual stacks.",
          "If those plugins are central to how your team works, Ultracite's ESLint route is the better fit. If you want fewer moving parts, Biome usually stays the cleaner default.",
        ],
        title: "What Biome gives up versus the ESLint ecosystem",
      },
    ],
    sectionsDescription:
      "This page is for teams already leaning toward Biome and trying to decide whether Ultracite meaningfully improves the day-to-day experience.",
    sectionsTitle: "When Biome is the right Ultracite default",
    videosDescription:
      "These walkthroughs focus on the Biome migration path and show what the setup looks like in a real project instead of a generic landing-page demo.",
    videosTitle: "Watch the Biome migration flow in action",
  },
  eslint: {
    benefitsDescription:
      "ESLint remains the safest choice when your team depends on plugin coverage, type-aware rules, or framework-specific linting behavior that has grown up around the wider JavaScript ecosystem.",
    benefitsTitle:
      "Why teams keep the ESLint ecosystem and still use Ultracite",
    configDescription:
      "Ultracite keeps the three-tool model intact. You still get dedicated config for ESLint, Prettier, and Stylelint, but the presets absorb the repetitive setup work that usually sprawls across projects.",
    configTitle: "What changes in your ESLint, Prettier, and Stylelint setup",
    faqs: [
      {
        answer:
          "No. Ultracite packages a strong default, but you can still layer in project-specific plugins and overrides when your stack needs them.",
        question: "Can I keep custom ESLint plugins with Ultracite?",
      },
      {
        answer:
          "Yes. That separation is deliberate. ESLint continues handling code quality, Prettier handles formatting, and Stylelint covers CSS so you keep the mature ecosystem behavior many teams already trust.",
        question:
          "Why does Ultracite still generate three config files for ESLint?",
      },
      {
        answer:
          "Choose ESLint when ecosystem compatibility matters more than raw speed. If you need the broadest set of integrations and framework-aware linting, ESLint is still the safer default.",
        question: "When is ESLint the better choice than Biome or Oxlint?",
      },
      {
        answer:
          "Yes. Ultracite's ESLint presets preserve type-aware linting and the deeper analysis many TypeScript-heavy teams rely on for correctness.",
        question: "Will I still get type-aware linting?",
      },
      {
        answer:
          "If your team is mainly trying to reduce waiting time, Oxlint is worth evaluating. If your pain is configuration sprawl rather than execution speed, keeping ESLint through Ultracite is usually the lower-risk move.",
        question: "Should I switch away from ESLint just to go faster?",
      },
    ],
    faqsDescription:
      "These are the usual questions from teams that want less config churn but do not want to abandon the mature ESLint ecosystem.",
    faqsTitle: "ESLint migration FAQ",
    heroDescription:
      "Ultracite preserves the mature ESLint, Prettier, and Stylelint workflow while packaging the defaults, plugin choices, and editor expectations that usually get copied from repo to repo by hand.",
    heroTitle: "Stay on ESLint, Prettier, and Stylelint with less setup burden",
    metadataDescription:
      "Use Ultracite with ESLint, Prettier, and Stylelint when you want the mature ecosystem without the usual config sprawl. Learn what changes, what stays the same, and when ESLint is the right fit.",
    metadataTitle: "Use Ultracite with ESLint, Prettier, and Stylelint",
    resources: [
      {
        description:
          "Migration instructions for moving an existing ESLint-based project onto Ultracite's presets.",
        href: `${docsUrl}/migrate/eslint`,
        title: "Read the ESLint migration guide",
      },
      {
        description:
          "Provider reference docs for the included plugins, formatter defaults, and VS Code extension setup.",
        href: `${docsUrl}/provider/eslint`,
        title: "Review the ESLint provider docs",
      },
    ],
    resourcesDescription:
      "Use the migration guide when you are updating an existing stack and the provider docs when you need a deeper reference on plugins, formatter defaults, and editor setup.",
    resourcesTitle: "Related ESLint resources",
    sections: [
      {
        icon: "Puzzle",
        paragraphs: [
          "ESLint keeps winning when your team needs plugin breadth, mature framework integrations, or rule coverage that has grown with the wider JavaScript and TypeScript ecosystem.",
          "For larger organizations or unusual stacks, that compatibility can matter more than shaving every last second off the lint run.",
        ],
        title: "Choose ESLint for broader ecosystem coverage",
      },
      {
        icon: "Layers",
        paragraphs: [
          "Ultracite improves the ESLint path by packaging the repetitive defaults: plugin selection, formatter alignment, Stylelint wiring, and editor behavior.",
          "You still get the flexibility of the classic stack, but you spend less time rebuilding the same conventions in every repo.",
        ],
        title: "How Ultracite reduces ESLint setup churn",
      },
      {
        icon: "ShieldCheck",
        paragraphs: [
          "Some teams should absolutely stay on ESLint. If your workflow depends on specialized plugins, highly customized framework rules, or deep type-aware coverage, the migration risk of switching away is rarely worth it.",
          "Ultracite is useful here because it reduces maintenance overhead without forcing that trade.",
        ],
        title: "When staying on ESLint is the safer choice",
      },
    ],
    sectionsDescription:
      "This route is for teams that want stronger defaults and less maintenance while staying inside the most established linting ecosystem.",
    sectionsTitle: "When the ESLint ecosystem is still the right call",
  },
  oxlint: {
    benefitsDescription:
      "Oxlint teams reach for Ultracite when they already believe in the speed-first stack and want a cleaner way to standardize presets, editor defaults, and rollout decisions across multiple repos.",
    benefitsTitle: "Why Oxlint teams add Ultracite on top",
    configDescription:
      "Oxlint and Oxfmt stay separate, but Ultracite moves the shared defaults into presets so your speed-first stack is easier to keep aligned across repos without rebuilding the same config by hand.",
    configTitle: "What Ultracite adds to your Oxlint and Oxfmt setup",
    faqs: [
      {
        answer:
          "Yes. Ultracite is designed to sit on top of the Oxlint stack your team already chose. The value is not changing providers. The value is packaging the shared rules, defaults, and editor behavior so every repo does not drift.",
        question:
          "Can I use Ultracite if my team already standardized on Oxlint?",
      },
      {
        answer:
          "Not necessarily. Oxlint focuses on fast linting. Oxfmt is the natural pairing if you want the Oxc toolchain, but Ultracite still works best when you treat formatting as an explicit decision instead of an afterthought.",
        question: "Do I have to use Oxfmt with Oxlint?",
      },
      {
        answer:
          "Ultracite keeps the staged-adoption path open. Teams often use it to define the Oxlint baseline now, then simplify the surrounding tooling over time rather than forcing a single all-at-once migration.",
        question:
          "Can Ultracite still help if we are rolling Oxlint out gradually?",
      },
      {
        answer:
          "Biome is a better fit when you want an all-in-one workflow. ESLint is still better when you need the broadest plugin surface. Oxlint remains the speed-first choice, but Ultracite does not erase those tradeoffs.",
        question: "What tradeoffs should Oxlint teams still keep in mind?",
      },
      {
        answer:
          "Yes, as long as the team is comfortable with the still-evolving ecosystem tradeoffs. Ultracite makes Oxlint easier to operationalize by adding presets, editor defaults, and a documented baseline that can be reused across projects.",
        question: "Is Oxlint mature enough for a shared team standard?",
      },
    ],
    faqsDescription:
      "These are the questions that come up when a team is seriously considering Oxlint for performance reasons and wants an honest view of the tradeoffs.",
    faqsTitle: "Oxlint migration FAQ",
    heroDescription:
      "Ultracite keeps the Oxlint and Oxfmt stack your team already chose, then adds a reusable baseline for presets, editor defaults, and staged rollout so speed-first teams do not reinvent the setup in every repository.",
    heroTitle: "Standardize your Oxlint workflow with Ultracite",
    metadataDescription:
      "Use Ultracite on top of Oxlint and Oxfmt when your team already chose the speed-first stack. Learn what Ultracite adds, how rollout works, and where Oxlint still differs from Biome and ESLint.",
    metadataTitle: "Use Ultracite with Oxlint and Oxfmt",
    resources: [
      {
        description:
          "Migration instructions for moving an existing Oxlint project or testing Oxlint as a new baseline.",
        href: `${docsUrl}/migrate/oxlint`,
        title: "Read the Oxlint migration guide",
      },
      {
        description:
          "Provider reference docs covering rule categories, formatter defaults, and extension setup for Oxlint and Oxfmt.",
        href: `${docsUrl}/provider/oxlint`,
        title: "Review the Oxlint provider docs",
      },
    ],
    resourcesDescription:
      "Use the migration guide when you are rolling the stack out and the provider docs when you need a deeper reference on presets, formatter defaults, and editor setup.",
    resourcesTitle: "Related Oxlint resources",
    sections: [
      {
        icon: "Zap",
        paragraphs: [
          "Oxlint teams usually do not need to be convinced about speed anymore. What they need is a way to turn that provider choice into a repeatable team standard instead of a collection of one-off repo decisions.",
          "Ultracite helps by giving the stack a documented baseline that can survive onboarding, repo creation, and editor differences.",
        ],
        title: "Why Oxlint teams add Ultracite on top",
      },
      {
        icon: "FolderTree",
        paragraphs: [
          "The biggest win is not a new linter. It is a reusable setup story. Presets, editor defaults, and migration guidance stop living in tribal knowledge and start living in one place.",
          "That matters most when multiple teams or repos are trying to adopt Oxlint without drifting into subtly different local conventions.",
        ],
        title: "How Ultracite standardizes the Oxlint workflow",
      },
      {
        icon: "Scale",
        paragraphs: [
          "Oxlint is not a universal replacement for every team today. Biome is simpler if you want a single tool for linting and formatting, and ESLint still has the deepest plugin ecosystem.",
          "Ultracite keeps those tradeoffs visible. It strengthens the Oxlint path, but it does not pretend the differences from Biome and ESLint disappear.",
        ],
        title: "Where Oxlint still differs from Biome and ESLint",
      },
    ],
    sectionsDescription:
      "This route is for teams that already chose Oxlint and want a cleaner, more repeatable way to standardize that stack across projects.",
    sectionsTitle: "What Ultracite adds for Oxlint teams",
  },
};

export const getProviderPageContent = (providerId: ProviderId) =>
  providerContent[providerId];
