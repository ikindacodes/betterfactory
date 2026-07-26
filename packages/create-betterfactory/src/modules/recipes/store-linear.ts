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
    "Linear Work Item Store: read issues/teams; create and comment (writes require approval).",
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
import { formatWorkItemBody } from "#lib/work-item.js";

export default defineTool({
  description:
    "Format canonical Work Item fields into markdown for Linear issue description.",
  inputSchema: z.object({
    context: z.string(),
    outcome: z.string(),
    acceptanceCriteria: z.string(),
    constraints: z.string(),
    pointers: z.string(),
    handoffNotes: z.string(),
  }),
  async execute(input) {
    return { markdown: formatWorkItemBody(input) };
  },
});
`;

export const storeLinearRecipe: ModuleRecipe = {
  id: "store-linear",
  label: "Linear",
  description: "Work Item Store via Linear MCP connection (writes need approval)",
  provides: { store: "linear" },
  files: {
    // Subagents do not inherit root connections — install on both specialists.
    "agent/subagents/planner/connections/linear.ts": linearConnection,
    "agent/subagents/reviewer/connections/linear.ts": linearConnection,
    "agent/subagents/planner/tools/format_work_item_markdown.ts": formatTool,
    "agent/subagents/planner/skills/linear-store.md": `---
description: How to use Linear as the Work Item Store. Load before filing Work Items.
---

# Linear Work Item Store

Use Linear MCP tools (\`linear__*\` after discovery):

- Create/update issues with the canonical Work Item sections in the description (Context, Outcome, Acceptance criteria, Constraints, Pointers, Handoff notes).
- Use \`format_work_item_markdown\` to build the description body.
- Writes require human approval — expected.
- Do **not** mark Ready for Handoff yourself; Reviewer gates readiness (prefer a \`ready-for-handoff\` label if available).
`,
    "agent/subagents/reviewer/skills/linear-review.md": `---
description: How to review Linear Work Items. Load before reviewing.
---

# Reviewing Linear Work Items

- Read the issue via Linear tools; comment with feedback.
- Gate Ready for Handoff with a label or agreed status field — do not freely rewrite the issue body.
- Suggest wording in comments for the Planner to apply.
`,
  },
};
