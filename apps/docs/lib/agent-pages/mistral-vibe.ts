import type { AgentPageContent } from "./types";

export const mistralVibe: AgentPageContent = {
  checked: { date: "2026-10-10", version: "2.26.1" },
  faqs: [
    {
      answer:
        "Yes. It loads `~/.vibe/AGENTS.md`, and every `AGENTS.md` from your working folder up to the folder you trusted. In a folder you haven’t trusted, only your global file loads.",
      question: "Does Mistral Vibe read AGENTS.md?",
    },
    {
      answer:
        "Check that the folder is trusted. Vibe asks the first time it finds an `AGENTS.md` or a `.vibe` or `.agents` folder; if you declined, change the entry in `~/.vibe/trusted_folders.toml`. For `vibe --prompt` runs, pass `--trust`.",
      question: "Why isn’t Vibe following my AGENTS.md?",
    },
    {
      answer:
        "Yes: `pre_tool`, `post_tool` and `post_agent` hooks in `.vibe/hooks.toml` (trusted folders only) or `~/.vibe/hooks.toml`. A `post_tool` hook can append text to the tool output the model reads. Ultracite doesn’t set one up for Vibe yet.",
      question: "Does Mistral Vibe support hooks?",
    },
    {
      answer:
        '`vibe --prompt "…" --trust --auto-approve` loads `AGENTS.md` and lets Vibe run `ultracite` without prompts. Add `--max-turns` or `--time-limit` to bound the run. Exit code 0 means the agent finished; 3 means it stopped early, at a limit for example.',
      question: "How do I run Vibe with Ultracite in CI?",
    },
  ],
  headline: "Mistral Vibe reads AGENTS.md in trusted folders",
  highlights: [
    {
      body: "Reading a file below the working folder appends any `AGENTS.md` between the two to the read result, once per directory, so a package’s own rules arrive when Vibe opens its code.",
      title: "Deeper rules arrive with the file",
    },
    {
      body: "The default `accept-edits` agent applies `write_file` and `edit` without asking but confirms shell commands, `ultracite` included. `plan` is read-only, and `auto-approve` (or `--yolo`) approves everything.",
      title: "Edits go through, commands wait for you",
    },
    {
      body: "A `post_agent` hook runs when a turn ends with no tool calls pending. If it returns `deny` with a `reason`, the reason goes back to the model as a new message asking for a retry, up to 3 times per user turn.",
      title: "post_agent hooks can send a turn back",
    },
  ],
  intro:
    "Mistral Vibe loads `AGENTS.md` from your working folder up to the folder you trusted, and adds deeper ones as it reads files below them. Nothing from the project loads until you trust the folder, which Vibe asks about once it sees an `AGENTS.md`. After an edit, it runs `ultracite fix` and `check` when the rules say to.",
  loop: {
    body: "Vibe has `post_tool` hooks that can add text to what the model sees after a tool runs, but Ultracite doesn’t set one up for Vibe yet. Until then the check is the commands in `AGENTS.md`, which Vibe runs with its `bash` tool.",
    steps: [
      "Vibe changes a file with `write_file` or `edit`, which the default `accept-edits` agent applies without asking.",
      "Following `AGENTS.md`, it runs `npx ultracite fix` or `npx ultracite check` with its `bash` tool.",
      "Vibe asks before that command runs, unless you’re on `auto-approve` or passed `--yolo`.",
      "It reads the output and fixes what’s left.",
    ],
    title: "The rules drive the check, for now",
  },
  metaDescription:
    "Set up Ultracite for Mistral Vibe: rules in AGENTS.md, loaded from your folder up to the one you trusted, with deeper AGENTS.md files added as Vibe reads.",
  metaTitle: "Ultracite for Mistral Vibe — Rules that load in trusted folders",
  related: ["kimi-cli", "qwen", "crush"],
  rules: {
    facts: [
      {
        label: "Trust first",
        value:
          "Project `AGENTS.md` files, skills and hooks load only in a trusted folder. Vibe asks when the folder or its repo root has an `AGENTS.md`, `.vibe` or `.agents`.",
      },
      {
        label: "Trust the repo",
        value:
          "Started in a subfolder, Vibe offers to trust the whole repo, so every `AGENTS.md` from the root down applies.",
      },
      {
        label: "Where trust lives",
        value:
          "`~/.vibe/trusted_folders.toml`. `--trust` trusts the folder for one run without saving it.",
      },
      {
        label: "Priority",
        value:
          "Closer files override more distant ones, and `AGENTS.md` overrides Vibe’s default prompt.",
      },
      {
        label: "Extra folders",
        value:
          "Each `--add-dir` folder is trusted for the session and adds its own `AGENTS.md`.",
      },
      {
        label: "Found mid-session",
        value:
          "On your own machine Vibe looks for deeper files on every read, so one created mid-session is still picked up.",
      },
    ],
    lookup: [
      {
        note: "Your instructions for every project. Loads in any folder.",
        path: "~/.vibe/AGENTS.md",
      },
      {
        note: "Every one between the folder you trusted and where you started, outermost first. Skipped in an untrusted folder.",
        path: "AGENTS.md, trusted folder to working folder",
      },
      {
        note: "Added to a read result the first time Vibe reads a file below one, once per directory.",
        path: "Deeper AGENTS.md files",
      },
    ],
    summary:
      "Vibe stacks your global `~/.vibe/AGENTS.md` with every `AGENTS.md` from the working folder up to the trusted folder, outermost first, so the closest file wins a conflict.",
  },
  skills:
    "Vibe loads skills from `.agents/skills/` and `.vibe/skills/` at the project root in trusted folders, and from `~/.vibe/skills/` and `~/.agents/skills/`, so once you trust the folder it finds the Ultracite skill `init` installs in `.agents/skills/`.",
  sources: [
    {
      title: "Mistral Vibe: README",
      url: "https://github.com/mistralai/mistral-vibe#readme",
    },
    {
      title: "Mistral Vibe: Hooks",
      url: "https://docs.mistral.ai/vibe/code/cli/hooks",
    },
    {
      title: "Mistral Vibe: Skills",
      url: "https://docs.mistral.ai/vibe/code/cli/skills",
    },
    {
      title: "Mistral Vibe source: AGENTS.md discovery",
      url: "https://github.com/mistralai/mistral-vibe/blob/main/vibe/core/config/harness_files/_harness_manager.py",
    },
    {
      title: "Mistral Vibe source: trusted folders",
      url: "https://github.com/mistralai/mistral-vibe/blob/main/vibe/core/trusted_folders.py",
    },
  ],
};
