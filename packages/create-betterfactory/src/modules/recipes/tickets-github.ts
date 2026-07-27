import type { ModuleRecipe } from "../types.js";

const createTicket = `import { defineTool } from "eve/tools";
import { always } from "eve/tools/approval";
import { z } from "zod";
import {
  formatTicketBody,
  READY_FOR_HANDOFF_LABEL,
} from "#lib/ticket.js";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(\`\${name} is required for the GitHub ticket backend\`);
  return v;
}

export default defineTool({
  description:
    "Create a ticket as a GitHub Issue with canonical handoff fields. Requires human approval. Leaves Ready for Handoff unset (false).",
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
    const body = formatTicketBody(input);

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
      throw new Error(\`GitHub create ticket failed (\${res.status}): \${text}\`);
    }

    const ticket = (await res.json()) as {
      number: number;
      html_url: string;
      title: string;
    };

    return {
      id: String(ticket.number),
      url: ticket.html_url,
      title: ticket.title,
      readyForHandoff: false,
      readyLabel: READY_FOR_HANDOFF_LABEL,
    };
  },
});
`;

const updateTicket = `import { defineTool } from "eve/tools";
import { always } from "eve/tools/approval";
import { z } from "zod";
import { formatTicketBody } from "#lib/ticket.js";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(\`\${name} is required for the GitHub ticket backend\`);
  return v;
}

export default defineTool({
  description:
    "Update a ticket (GitHub Issue) body/title. Requires human approval. Planner-owned authoring.",
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
      patch.body = formatTicketBody({
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
      throw new Error(\`GitHub update ticket failed (\${res.status}): \${text}\`);
    }

    const ticket = (await res.json()) as { number: number; html_url: string };
    return { id: String(ticket.number), url: ticket.html_url };
  },
});
`;

const getTicket = `import { defineTool } from "eve/tools";
import { z } from "zod";
import { parseReadyFromLabels } from "#lib/ticket.js";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(\`\${name} is required for the GitHub ticket backend\`);
  return v;
}

export default defineTool({
  description: "Fetch a ticket (GitHub Issue) by number for cold review.",
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
      throw new Error(\`GitHub get ticket failed (\${res.status}): \${text}\`);
    }

    const ticket = (await res.json()) as {
      number: number;
      title: string;
      body: string | null;
      html_url: string;
      labels: Array<{ name: string }>;
    };

    return {
      id: String(ticket.number),
      title: ticket.title,
      body: ticket.body ?? "",
      url: ticket.html_url,
      readyForHandoff: parseReadyFromLabels(ticket.labels.map((l) => l.name)),
    };
  },
});
`;

const commentTicket = `import { defineTool } from "eve/tools";
import { z } from "zod";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(\`\${name} is required for the GitHub ticket backend\`);
  return v;
}

export default defineTool({
  description: "Comment on a ticket (GitHub Issue). Used by Reviewer for cold-context feedback.",
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
import { READY_FOR_HANDOFF_LABEL } from "#lib/ticket.js";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(\`\${name} is required for the GitHub ticket backend\`);
  return v;
}

export default defineTool({
  description:
    "Set or clear Ready for Handoff on a GitHub ticket via the ready-for-handoff label. Reviewer gate.",
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
      throw new Error(\`GitHub get ticket failed (\${getRes.status})\`);
    }
    const ticket = (await getRes.json()) as {
      labels: Array<{ name: string }>;
    };
    const labels = new Set(ticket.labels.map((l) => l.name));
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

export const ticketsGithubRecipe: ModuleRecipe = {
  id: "tickets-github",
  label: "GitHub Issues",
  description: "Tickets as GitHub Issues (default)",
  provides: { tickets: "github" },
  files: {
    "agent/subagents/planner/tools/create_ticket.ts": createTicket,
    "agent/subagents/planner/tools/update_ticket.ts": updateTicket,
    "agent/subagents/planner/tools/get_ticket.ts": getTicket,
    "agent/subagents/reviewer/tools/get_ticket.ts": getTicket,
    "agent/subagents/reviewer/tools/comment_ticket.ts": commentTicket,
    "agent/subagents/reviewer/tools/set_ready_for_handoff.ts": setReady,
    "agent/subagents/planner/skills/file-github.md": `---
description: File tickets to GitHub. Use when creating or updating a GitHub ticket.
---

# File GitHub

Map canonical fields into a GitHub Issue (ticket). **Done** when the ticket exists with full body sections and Ready for Handoff left unset for Reviewer.

## Tools

| Tool | Use |
|------|-----|
| \`create_ticket\` | New ticket (approval required) |
| \`update_ticket\` | Title/body (approval required; send all body fields when changing content) |
| \`get_ticket\` | Read for context |

## Rules

- Body sections: Context, Outcome, Acceptance criteria, Constraints, Pointers, Handoff notes.
- Reviewer owns Ready for Handoff via \`set_ready_for_handoff\` / the \`ready-for-handoff\` label.
`,
    "agent/subagents/reviewer/skills/gate-github.md": `---
description: Gate Ready for Handoff on GitHub tickets. Use when cold-reading a GitHub ticket for the Reviewer gate.
---

# Gate GitHub

Cold-read and gate. **Done** when every Ready for Handoff bar is scored, feedback is commented if needed, and the ready label matches the result.

## Steps

1. \`get_ticket\` — load ticket body only.
2. Load \`check-ready-for-handoff\` — score every bar pass/fail with a one-line reason.
3. Any fail: \`comment_ticket\` with blockers; \`set_ready_for_handoff\` ready false.
4. All pass: \`set_ready_for_handoff\` ready true; brief confirm.

## Rules

- Comment suggested wording; Planner rewrites bodies.
- Create the \`ready-for-handoff\` label in the repo if the API rejects unknown labels.
`,
  },
};
