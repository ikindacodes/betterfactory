import type { ModuleRecipe } from "../types.js";

/**
 * Slack channel Module — skill + notes. create-betterfactory runs
 * `eve channels add slack -y` after deps install to scaffold agent/channels/slack.ts.
 * Connect / OAuth remains a human step.
 */
export const channelSlackRecipe: ModuleRecipe = {
  id: "channel-slack",
  label: "Slack",
  description:
    "Optional Slack surface (scaffolded via eve channels add slack -y after install)",
  provides: { channel: "slack" },
  files: {
    "agent/skills/operate-from-slack.md": `---
description: Operate this factory from Slack. Use when using the Slack channel or finishing Connect.
---

# Operate from Slack

Same Root as the eve TUI — ticket flow is unchanged.

## Setup

\`create-betterfactory\` already runs:

\`\`\`bash
npx eve channels add slack -y
\`\`\`

after dependency install when Slack is selected. That scaffolds \`agent/channels/slack.ts\`.

Finish Connect / OAuth (prefer Vercel Connect) so credentials work — see \`SLACK.md\`.

## Runtime

Treat Slack messages as Root intake. Route to Planner and Reviewer as usual.
`,

    "SLACK.md": `# Slack channel

This Stack requested Slack.

## What create-betterfactory did

After dependency install it ran:

\`\`\`bash
npx eve channels add slack -y
\`\`\`

That scaffolds the channel module (\`agent/channels/slack.ts\`). If that step was skipped (e.g. \`--skip-install\`), run the same command from this factory directory.

## What you still do

1. Ensure the app can deploy or run where Slack can reach it (or use Socket-style flows if your eve version supports them).
2. Complete Connect / OAuth as prompted by eve docs (prefer Vercel Connect).

The factory Root is the Slack-facing agent; Planner and Reviewer stay subagents. Ticket flow is unchanged.
`,
  },
};
