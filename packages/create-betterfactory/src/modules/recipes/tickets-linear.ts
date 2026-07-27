import type { ModuleRecipe } from "../types.js";

const linearConnection = `import { defineMcpClientConnection } from "eve/connections";

const ALLOWED_TOOLS = [
  "list_issues",
  "get_issue",
  "list_issue_labels",
  "list_teams",
  "get_team",
  "save_issue",
  "save_comment",
] as const;

const WRITE_TOOLS = ["save_issue", "save_comment"];

export default defineMcpClientConnection({
  url: "https://mcp.linear.app/mcp",
  description:
    "Linear tickets: read issues/teams; create and comment (writes require approval).",
  auth: {
    getToken: async () => {
      const token = process.env.LINEAR_API_KEY;
      if (!token) {
        throw new Error(
          "LINEAR_API_KEY is required — Linear → Settings → Security & access",
        );
      }
      return { token };
    },
  },
  tools: { allow: [...ALLOWED_TOOLS] },
  approval: ({ toolName }) =>
    WRITE_TOOLS.some((name) => toolName.includes(name)),
});
`;

const formatTool = `import { defineTool } from "eve/tools";
import { z } from "zod";
import { formatTicketBody } from "#lib/ticket.js";

export default defineTool({
  description:
    "Format canonical ticket fields into markdown for a Linear issue description.",
  inputSchema: z.object({
    context: z.string(),
    outcome: z.string(),
    acceptanceCriteria: z.string(),
    constraints: z.string(),
    pointers: z.string(),
    handoffNotes: z.string(),
  }),
  async execute(input) {
    return { markdown: formatTicketBody(input) };
  },
});
`;

export const ticketsLinearRecipe: ModuleRecipe = {
  id: "tickets-linear",
  label: "Linear",
  description: "Tickets via Linear MCP connection (writes need approval)",
  provides: { tickets: "linear" },
  files: {
    // Subagents do not inherit root connections — install on both specialists.
    "agent/subagents/planner/connections/linear.ts": linearConnection,
    "agent/subagents/reviewer/connections/linear.ts": linearConnection,
    "agent/subagents/planner/tools/format_ticket_markdown.ts": formatTool,
    "agent/subagents/planner/skills/file-linear.md": `---
description: File tickets to Linear. Use when creating or updating a Linear ticket.
---

# File Linear

Map canonical fields into a Linear issue (ticket). **Done** when the ticket exists with full description sections and Ready for Handoff left for Reviewer.

## Steps

1. Discover Linear MCP tools (\`linear__*\`).
2. Build the description with \`format_ticket_markdown\` (Context, Outcome, Acceptance criteria, Constraints, Pointers, Handoff notes).
3. Create or update via Linear tools (\`save_issue\`, etc.). Writes need human approval — expected.

## Rules

- Reviewer owns Ready for Handoff (prefer a \`ready-for-handoff\` label when available).
`,
    "agent/subagents/reviewer/skills/gate-linear.md": `---
description: Gate Ready for Handoff on Linear tickets. Use when cold-reading a Linear ticket for the Reviewer gate.
---

# Gate Linear

Cold-read and gate. **Done** when every Ready for Handoff bar is scored, feedback is commented if needed, and the ready label/status matches the result.

## Steps

1. Read the ticket via Linear MCP tools — body only.
2. Load \`check-ready-for-handoff\` — score every bar pass/fail with a one-line reason.
3. Any fail: comment blockers; clear Ready for Handoff.
4. All pass: set Ready for Handoff (label or agreed status field); brief confirm.

## Rules

- Comment suggested wording; Planner rewrites bodies.
`,
  },
};
