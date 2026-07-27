import type { ModuleRecipe } from "../types.js";

const createTicket = `import { defineTool } from "eve/tools";
import { z } from "zod";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { formatTicketBody } from "#lib/ticket.js";

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

export default defineTool({
  description:
    "Create a ticket as markdown under tickets/. No remote approval gate (local files).",
  inputSchema: z.object({
    title: z.string().min(1),
    context: z.string(),
    outcome: z.string(),
    acceptanceCriteria: z.string(),
    constraints: z.string(),
    pointers: z.string(),
    handoffNotes: z.string(),
  }),
  async execute(input) {
    const dir = path.join(process.cwd(), "tickets");
    await mkdir(dir, { recursive: true });
    const slug = slugify(input.title) || "ticket";
    const filename = \`\${slug}.md\`;
    const filePath = path.join(dir, filename);
    const body = \`---
title: \${JSON.stringify(input.title)}
readyForHandoff: false
---

# \${input.title}

\${formatTicketBody(input)}
\`;
    await writeFile(filePath, body, "utf8");
    return {
      id: filename,
      path: \`tickets/\${filename}\`,
      readyForHandoff: false,
    };
  },
});
`;

const updateTicket = `import { defineTool } from "eve/tools";
import { z } from "zod";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { formatTicketBody } from "#lib/ticket.js";

export default defineTool({
  description: "Update a markdown ticket under tickets/. Planner-owned authoring.",
  inputSchema: z.object({
    id: z.string().describe("Filename e.g. fix-checkout.md"),
    title: z.string().min(1),
    context: z.string(),
    outcome: z.string(),
    acceptanceCriteria: z.string(),
    constraints: z.string(),
    pointers: z.string(),
    handoffNotes: z.string(),
  }),
  async execute(input) {
    const filePath = path.join(process.cwd(), "tickets", input.id);
    const body = \`---
title: \${JSON.stringify(input.title)}
readyForHandoff: false
---

# \${input.title}

\${formatTicketBody(input)}
\`;
    await writeFile(filePath, body, "utf8");
    return { id: input.id, path: \`tickets/\${input.id}\`, readyForHandoff: false };
  },
});
`;

const getTicket = `import { defineTool } from "eve/tools";
import { z } from "zod";
import { readFile } from "node:fs/promises";
import path from "node:path";

export default defineTool({
  description: "Read a markdown ticket for cold review.",
  inputSchema: z.object({
    id: z.string(),
  }),
  async execute({ id }) {
    const filePath = path.join(process.cwd(), "tickets", id);
    const body = await readFile(filePath, "utf8");
    const ready = /readyForHandoff:\\s*true/.test(body);
    const titleMatch = body.match(/^title:\\s*(.+)$/m);
    return {
      id,
      path: \`tickets/\${id}\`,
      title: titleMatch?.[1]?.replace(/^"|"$/g, "") ?? id,
      body,
      readyForHandoff: ready,
    };
  },
});
`;

const commentTicket = `import { defineTool } from "eve/tools";
import { z } from "zod";
import { appendFile } from "node:fs/promises";
import path from "node:path";

export default defineTool({
  description: "Append a Reviewer comment section to a markdown ticket.",
  inputSchema: z.object({
    id: z.string(),
    body: z.string().min(1),
  }),
  async execute({ id, body }) {
    const filePath = path.join(process.cwd(), "tickets", id);
    const stamp = new Date().toISOString();
    await appendFile(
      filePath,
      \`\\n\\n## Review comment (\${stamp})\\n\\n\${body}\\n\`,
      "utf8",
    );
    return { id, path: \`tickets/\${id}\` };
  },
});
`;

const setReady = `import { defineTool } from "eve/tools";
import { z } from "zod";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export default defineTool({
  description: "Set readyForHandoff frontmatter on a markdown ticket. Reviewer gate.",
  inputSchema: z.object({
    id: z.string(),
    ready: z.boolean(),
  }),
  async execute({ id, ready }) {
    const filePath = path.join(process.cwd(), "tickets", id);
    let content = await readFile(filePath, "utf8");
    if (/readyForHandoff:\\s*(true|false)/.test(content)) {
      content = content.replace(
        /readyForHandoff:\\s*(true|false)/,
        \`readyForHandoff: \${ready}\`,
      );
    } else if (content.startsWith("---")) {
      content = content.replace(/^---\\n/, \`---\\nreadyForHandoff: \${ready}\\n\`);
    } else {
      content = \`---\\nreadyForHandoff: \${ready}\\n---\\n\\n\${content}\`;
    }
    await writeFile(filePath, content, "utf8");
    return { id, readyForHandoff: ready };
  },
});
`;

export const ticketsMarkdownRecipe: ModuleRecipe = {
  id: "tickets-markdown",
  label: "Markdown folder",
  description:
    "Tickets as markdown files under tickets/ (no remote write approval)",
  provides: { tickets: "markdown" },
  files: {
    "tickets/.gitkeep": "",
    "agent/subagents/planner/tools/create_ticket.ts": createTicket,
    "agent/subagents/planner/tools/update_ticket.ts": updateTicket,
    "agent/subagents/planner/tools/get_ticket.ts": getTicket,
    "agent/subagents/reviewer/tools/get_ticket.ts": getTicket,
    "agent/subagents/reviewer/tools/comment_ticket.ts": commentTicket,
    "agent/subagents/reviewer/tools/set_ready_for_handoff.ts": setReady,
    "agent/subagents/planner/skills/file-markdown.md": `---
description: File tickets to tickets/*.md. Use when creating or updating a markdown ticket.
---

# File Markdown

Write canonical fields under \`tickets/*.md\`. **Done** when the file exists with full body sections and \`readyForHandoff: false\` for Reviewer.

## Tools

| Tool | Use |
|------|-----|
| \`create_ticket\` | New \`tickets/<slug>.md\` (no remote approval) |
| \`update_ticket\` | Rewrite title + body by filename id |
| \`get_ticket\` | Read for context |

## Rules

- Body sections: Context, Outcome, Acceptance criteria, Constraints, Pointers, Handoff notes.
- Reviewer owns Ready for Handoff via \`set_ready_for_handoff\`.
`,
    "agent/subagents/reviewer/skills/gate-markdown.md": `---
description: Gate Ready for Handoff on tickets/*.md. Use when cold-reading a markdown ticket for the Reviewer gate.
---

# Gate Markdown

Cold-read and gate. **Done** when every Ready for Handoff bar is scored, feedback is appended if needed, and frontmatter \`readyForHandoff\` matches the result.

## Steps

1. \`get_ticket\` — load file body only.
2. Load \`check-ready-for-handoff\` — score every bar pass/fail with a one-line reason.
3. Any fail: \`comment_ticket\` with blockers; \`set_ready_for_handoff\` ready false.
4. All pass: \`set_ready_for_handoff\` ready true; brief confirm.

## Rules

- Append review comments; Planner rewrites the main body.
`,
  },
};
