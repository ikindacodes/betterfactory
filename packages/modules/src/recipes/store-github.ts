import type { ModuleRecipe } from "../types.js";

const createWorkItem = `import { defineTool } from "eve/tools";
import { always } from "eve/tools/approval";
import { z } from "zod";
import {
  formatWorkItemBody,
  READY_FOR_HANDOFF_LABEL,
} from "#lib/work-item.js";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(\`\${name} is required for the GitHub Work Item Store\`);
  return v;
}

export default defineTool({
  description:
    "Create a Work Item as a GitHub Issue. Requires human approval. Leaves Ready for Handoff unset (false).",
  inputSchema: z.object({
    title: z.string().min(1),
    context: z.string(),
    outcome: z.string(),
    acceptanceCriteria: z.string(),
    constraints: z.string(),
    pointers: z.string(),
    handoffNotes: z.string(),
  }),
  approval: always(),
  async execute(input) {
    const token = requireEnv("GITHUB_TOKEN");
    const owner = requireEnv("GITHUB_OWNER");
    const repo = requireEnv("GITHUB_REPO");
    const body = formatWorkItemBody(input);

    const res = await fetch(
      \`https://api.github.com/repos/\${owner}/\${repo}/issues\`,
      {
        method: "POST",
        headers: {
          authorization: \`Bearer \${token}\`,
          accept: "application/vnd.github+json",
          "content-type": "application/json",
          "x-github-api-version": "2022-11-28",
        },
        body: JSON.stringify({
          title: input.title,
          body,
          labels: [],
        }),
      },
    );

    if (!res.ok) {
      const text = await res.text();
      throw new Error(\`GitHub create issue failed (\${res.status}): \${text}\`);
    }

    const issue = (await res.json()) as {
      number: number;
      html_url: string;
      title: string;
    };

    return {
      id: String(issue.number),
      url: issue.html_url,
      title: issue.title,
      readyForHandoff: false,
      readyLabel: READY_FOR_HANDOFF_LABEL,
    };
  },
});
`;

const updateWorkItem = `import { defineTool } from "eve/tools";
import { always } from "eve/tools/approval";
import { z } from "zod";
import { formatWorkItemBody } from "#lib/work-item.js";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(\`\${name} is required for the GitHub Work Item Store\`);
  return v;
}

export default defineTool({
  description:
    "Update a Work Item (GitHub Issue) body/title. Requires human approval. Planner-owned authoring.",
  inputSchema: z.object({
    number: z.number().int().positive(),
    title: z.string().min(1).optional(),
    context: z.string().optional(),
    outcome: z.string().optional(),
    acceptanceCriteria: z.string().optional(),
    constraints: z.string().optional(),
    pointers: z.string().optional(),
    handoffNotes: z.string().optional(),
  }),
  approval: always(),
  async execute(input) {
    const token = requireEnv("GITHUB_TOKEN");
    const owner = requireEnv("GITHUB_OWNER");
    const repo = requireEnv("GITHUB_REPO");

    const patch: { title?: string; body?: string } = {};
    if (input.title) patch.title = input.title;

    const hasBody =
      input.context !== undefined ||
      input.outcome !== undefined ||
      input.acceptanceCriteria !== undefined ||
      input.constraints !== undefined ||
      input.pointers !== undefined ||
      input.handoffNotes !== undefined;

    if (hasBody) {
      if (
        !input.context ||
        !input.outcome ||
        !input.acceptanceCriteria ||
        !input.constraints ||
        !input.pointers ||
        !input.handoffNotes
      ) {
        throw new Error(
          "When updating body fields, provide all of: context, outcome, acceptanceCriteria, constraints, pointers, handoffNotes",
        );
      }
      patch.body = formatWorkItemBody({
        context: input.context,
        outcome: input.outcome,
        acceptanceCriteria: input.acceptanceCriteria,
        constraints: input.constraints,
        pointers: input.pointers,
        handoffNotes: input.handoffNotes,
      });
    }

    const res = await fetch(
      \`https://api.github.com/repos/\${owner}/\${repo}/issues/\${input.number}\`,
      {
        method: "PATCH",
        headers: {
          authorization: \`Bearer \${token}\`,
          accept: "application/vnd.github+json",
          "content-type": "application/json",
          "x-github-api-version": "2022-11-28",
        },
        body: JSON.stringify(patch),
      },
    );

    if (!res.ok) {
      const text = await res.text();
      throw new Error(\`GitHub update issue failed (\${res.status}): \${text}\`);
    }

    const issue = (await res.json()) as { number: number; html_url: string };
    return { id: String(issue.number), url: issue.html_url };
  },
});
`;

const getWorkItem = `import { defineTool } from "eve/tools";
import { z } from "zod";
import { parseReadyFromLabels } from "#lib/work-item.js";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(\`\${name} is required for the GitHub Work Item Store\`);
  return v;
}

export default defineTool({
  description: "Fetch a Work Item (GitHub Issue) by number for cold review.",
  inputSchema: z.object({
    number: z.number().int().positive(),
  }),
  async execute({ number }) {
    const token = requireEnv("GITHUB_TOKEN");
    const owner = requireEnv("GITHUB_OWNER");
    const repo = requireEnv("GITHUB_REPO");

    const res = await fetch(
      \`https://api.github.com/repos/\${owner}/\${repo}/issues/\${number}\`,
      {
        headers: {
          authorization: \`Bearer \${token}\`,
          accept: "application/vnd.github+json",
          "x-github-api-version": "2022-11-28",
        },
      },
    );
    if (!res.ok) {
      const text = await res.text();
      throw new Error(\`GitHub get issue failed (\${res.status}): \${text}\`);
    }

    const issue = (await res.json()) as {
      number: number;
      title: string;
      body: string | null;
      html_url: string;
      labels: Array<{ name: string }>;
    };

    return {
      id: String(issue.number),
      title: issue.title,
      body: issue.body ?? "",
      url: issue.html_url,
      readyForHandoff: parseReadyFromLabels(issue.labels.map((l) => l.name)),
    };
  },
});
`;

const commentWorkItem = `import { defineTool } from "eve/tools";
import { z } from "zod";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(\`\${name} is required for the GitHub Work Item Store\`);
  return v;
}

export default defineTool({
  description: "Comment on a Work Item (GitHub Issue). Used by Reviewer for cold-context feedback.",
  inputSchema: z.object({
    number: z.number().int().positive(),
    body: z.string().min(1),
  }),
  async execute({ number, body }) {
    const token = requireEnv("GITHUB_TOKEN");
    const owner = requireEnv("GITHUB_OWNER");
    const repo = requireEnv("GITHUB_REPO");

    const res = await fetch(
      \`https://api.github.com/repos/\${owner}/\${repo}/issues/\${number}/comments\`,
      {
        method: "POST",
        headers: {
          authorization: \`Bearer \${token}\`,
          accept: "application/vnd.github+json",
          "content-type": "application/json",
          "x-github-api-version": "2022-11-28",
        },
        body: JSON.stringify({ body }),
      },
    );

    if (!res.ok) {
      const text = await res.text();
      throw new Error(\`GitHub comment failed (\${res.status}): \${text}\`);
    }

    const comment = (await res.json()) as { id: number; html_url: string };
    return { id: String(comment.id), url: comment.html_url };
  },
});
`;

const setReady = `import { defineTool } from "eve/tools";
import { z } from "zod";
import { READY_FOR_HANDOFF_LABEL } from "#lib/work-item.js";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(\`\${name} is required for the GitHub Work Item Store\`);
  return v;
}

export default defineTool({
  description:
    "Set or clear Ready for Handoff on a GitHub Issue via the ready-for-handoff label. Reviewer gate.",
  inputSchema: z.object({
    number: z.number().int().positive(),
    ready: z.boolean(),
  }),
  async execute({ number, ready }) {
    const token = requireEnv("GITHUB_TOKEN");
    const owner = requireEnv("GITHUB_OWNER");
    const repo = requireEnv("GITHUB_REPO");

    const getRes = await fetch(
      \`https://api.github.com/repos/\${owner}/\${repo}/issues/\${number}\`,
      {
        headers: {
          authorization: \`Bearer \${token}\`,
          accept: "application/vnd.github+json",
          "x-github-api-version": "2022-11-28",
        },
      },
    );
    if (!getRes.ok) {
      throw new Error(\`GitHub get issue failed (\${getRes.status})\`);
    }
    const issue = (await getRes.json()) as {
      labels: Array<{ name: string }>;
    };
    const labels = new Set(issue.labels.map((l) => l.name));
    if (ready) labels.add(READY_FOR_HANDOFF_LABEL);
    else labels.delete(READY_FOR_HANDOFF_LABEL);

    const res = await fetch(
      \`https://api.github.com/repos/\${owner}/\${repo}/issues/\${number}\`,
      {
        method: "PATCH",
        headers: {
          authorization: \`Bearer \${token}\`,
          accept: "application/vnd.github+json",
          "content-type": "application/json",
          "x-github-api-version": "2022-11-28",
        },
        body: JSON.stringify({ labels: [...labels] }),
      },
    );

    if (!res.ok) {
      const text = await res.text();
      throw new Error(\`GitHub set ready failed (\${res.status}): \${text}\`);
    }

    return { id: String(number), readyForHandoff: ready };
  },
});
`;

export const storeGithubRecipe: ModuleRecipe = {
  id: "store-github",
  label: "GitHub Issues",
  description: "Work Item Store backed by GitHub Issues (default)",
  provides: { store: "github" },
  files: {
    "agent/subagents/planner/tools/create_work_item.ts": createWorkItem,
    "agent/subagents/planner/tools/update_work_item.ts": updateWorkItem,
    "agent/subagents/planner/tools/get_work_item.ts": getWorkItem,
    "agent/subagents/reviewer/tools/get_work_item.ts": getWorkItem,
    "agent/subagents/reviewer/tools/comment_work_item.ts": commentWorkItem,
    "agent/subagents/reviewer/tools/set_ready_for_handoff.ts": setReady,
    "agent/subagents/planner/skills/github-store.md": `---
description: How to use the GitHub Issues Work Item Store. Load before creating or updating Work Items.
---

# GitHub Work Item Store

- \`create_work_item\` — create issue (approval required). Leave ready unset.
- \`update_work_item\` — update title/body (approval required). Provide full body fields when changing content.
- \`get_work_item\` — read issue for context.
- Do **not** use \`set_ready_for_handoff\` — that is the Reviewer's gate.
`,
    "agent/subagents/reviewer/skills/github-review.md": `---
description: How to review GitHub Work Items. Load before reviewing.
---

# Reviewing GitHub Work Items

- \`get_work_item\` — cold-read the issue body.
- \`comment_work_item\` — leave feedback; do not rewrite the issue body.
- \`set_ready_for_handoff\` — set \`ready: true|false\` via the \`ready-for-handoff\` label.
- Create the \`ready-for-handoff\` label in the repo if the API rejects unknown labels.
`,
  },
};
