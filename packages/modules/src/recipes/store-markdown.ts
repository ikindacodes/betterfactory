import type { ModuleRecipe } from "../types.js";

const createWorkItem = `import { defineTool } from "eve/tools";
import { z } from "zod";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { formatWorkItemBody } from "#lib/work-item.js";

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

export default defineTool({
  description:
    "Create a Work Item as markdown under issues/. No remote approval gate (local files).",
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
    const dir = path.join(process.cwd(), "issues");
    await mkdir(dir, { recursive: true });
    const slug = slugify(input.title) || "work-item";
    const filename = \`\${slug}.md\`;
    const filePath = path.join(dir, filename);
    const body = \`---
title: \${JSON.stringify(input.title)}
readyForHandoff: false
---

# \${input.title}

\${formatWorkItemBody(input)}
\`;
    await writeFile(filePath, body, "utf8");
    return {
      id: filename,
      path: \`issues/\${filename}\`,
      readyForHandoff: false,
    };
  },
});
`;

const updateWorkItem = `import { defineTool } from "eve/tools";
import { z } from "zod";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { formatWorkItemBody } from "#lib/work-item.js";

export default defineTool({
  description: "Update a markdown Work Item under issues/. Planner-owned authoring.",
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
    const filePath = path.join(process.cwd(), "issues", input.id);
    const body = \`---
title: \${JSON.stringify(input.title)}
readyForHandoff: false
---

# \${input.title}

\${formatWorkItemBody(input)}
\`;
    await writeFile(filePath, body, "utf8");
    return { id: input.id, path: \`issues/\${input.id}\`, readyForHandoff: false };
  },
});
`;

const getWorkItem = `import { defineTool } from "eve/tools";
import { z } from "zod";
import { readFile } from "node:fs/promises";
import path from "node:path";

export default defineTool({
  description: "Read a markdown Work Item for cold review.",
  inputSchema: z.object({
    id: z.string(),
  }),
  async execute({ id }) {
    const filePath = path.join(process.cwd(), "issues", id);
    const body = await readFile(filePath, "utf8");
    const ready = /readyForHandoff:\\s*true/.test(body);
    const titleMatch = body.match(/^title:\\s*(.+)$/m);
    return {
      id,
      path: \`issues/\${id}\`,
      title: titleMatch?.[1]?.replace(/^"|"$/g, "") ?? id,
      body,
      readyForHandoff: ready,
    };
  },
});
`;

const commentWorkItem = `import { defineTool } from "eve/tools";
import { z } from "zod";
import { appendFile } from "node:fs/promises";
import path from "node:path";

export default defineTool({
  description: "Append a Reviewer comment section to a markdown Work Item.",
  inputSchema: z.object({
    id: z.string(),
    body: z.string().min(1),
  }),
  async execute({ id, body }) {
    const filePath = path.join(process.cwd(), "issues", id);
    const stamp = new Date().toISOString();
    await appendFile(
      filePath,
      \`\\n\\n## Review comment (\${stamp})\\n\\n\${body}\\n\`,
      "utf8",
    );
    return { id, path: \`issues/\${id}\` };
  },
});
`;

const setReady = `import { defineTool } from "eve/tools";
import { z } from "zod";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export default defineTool({
  description: "Set readyForHandoff frontmatter on a markdown Work Item. Reviewer gate.",
  inputSchema: z.object({
    id: z.string(),
    ready: z.boolean(),
  }),
  async execute({ id, ready }) {
    const filePath = path.join(process.cwd(), "issues", id);
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

export const storeMarkdownRecipe: ModuleRecipe = {
  id: "store-markdown",
  label: "Markdown folder",
  description:
    "Work Item Store as markdown files under issues/ (no remote write approval)",
  provides: { store: "markdown" },
  files: {
    "issues/.gitkeep": "",
    "agent/subagents/planner/tools/create_work_item.ts": createWorkItem,
    "agent/subagents/planner/tools/update_work_item.ts": updateWorkItem,
    "agent/subagents/planner/tools/get_work_item.ts": getWorkItem,
    "agent/subagents/reviewer/tools/get_work_item.ts": getWorkItem,
    "agent/subagents/reviewer/tools/comment_work_item.ts": commentWorkItem,
    "agent/subagents/reviewer/tools/set_ready_for_handoff.ts": setReady,
    "agent/subagents/planner/skills/markdown-store.md": `---
description: Markdown folder Work Item Store. Load before filing.
---

# Markdown Work Item Store

- Files live under \`issues/*.md\`.
- \`create_work_item\` / \`update_work_item\` — no remote approval.
- Leave \`readyForHandoff: false\` for Reviewer.
`,
    "agent/subagents/reviewer/skills/markdown-review.md": `---
description: Review markdown Work Items. Load before reviewing.
---

# Reviewing markdown Work Items

- \`get_work_item\` then \`comment_work_item\` / \`set_ready_for_handoff\`.
- Do not rewrite the main body; comment and gate only.
`,
  },
};
