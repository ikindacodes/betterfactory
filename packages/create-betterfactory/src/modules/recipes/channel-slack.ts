import type { ModuleRecipe } from "../types.js";

/**
 * Slack channel Module — documents setup; full channel file is typically
 * added via `eve channels add slack` with Connect. We seed instructions.
 */
export const channelSlackRecipe: ModuleRecipe = {
  id: "channel-slack",
  label: "Slack",
  description: "Optional Slack surface (setup via eve channels add slack)",
  provides: { channel: "slack" },
  files: {
    "agent/skills/operate-from-slack.md": `---
description: Operate this factory from Slack. Use when adding or using the Slack channel.
---

# Operate from Slack

Same Root as the eve TUI — Work Item flow is unchanged. **Done** for setup when \`eve channels add slack\` has finished Connect.

## Setup

From the factory package root:

\`\`\`bash
npx eve channels add slack
\`\`\`

Prefer Vercel Connect for credentials.

## Runtime

Treat Slack messages as Root intake. Route to Planner and Reviewer as usual.
`,

    "SLACK.md": `# Slack channel

This Stack requested Slack. From this factory directory:

1. Ensure the app can deploy or run where Slack can reach it (or use Socket-style flows if your eve version supports them).
2. Run:

\`\`\`bash
npx eve channels add slack
\`\`\`

3. Complete Connect / OAuth as prompted by eve docs.

The factory Root is the Slack-facing agent; Planner and Reviewer stay subagents.
`,
  },
};
