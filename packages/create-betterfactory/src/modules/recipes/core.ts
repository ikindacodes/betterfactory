import type { ModuleRecipe } from "../types.js";
import { DEFINITION_OF_READY_CHECKLIST } from "../work-item.js";

const dorList = DEFINITION_OF_READY_CHECKLIST.map((c) => `- [ ] ${c}`).join(
  "\n",
);

export const coreRecipe: ModuleRecipe = {
  id: "core",
  label: "Core factory",
  description:
    "Root + Planner + Reviewer Software Factory graph with Definition of Ready",
  always: true,
  provides: { core: true },
  files: {
    "package.json": ({ packageName }) =>
      JSON.stringify(
        {
          name: packageName,
          version: "0.0.1",
          private: true,
          type: "module",
          imports: {
            "#*": "./agent/*",
            "#lib/*": "./lib/*",
          },
          scripts: {
            build: "eve build",
            dev: "eve dev",
            start: "eve start",
            typecheck: "tsc --noEmit",
          },
          dependencies: {
            ai: "latest",
            eve: "latest",
            zod: "latest",
          },
          devDependencies: {
            "@types/node": "24.x",
            typescript: "^5.8.0",
          },
          engines: {
            node: "24.x",
          },
        },
        null,
        2,
      ) + "\n",

    "tsconfig.json": JSON.stringify(
      {
        compilerOptions: {
          target: "ES2022",
          module: "NodeNext",
          moduleResolution: "NodeNext",
          strict: true,
          skipLibCheck: true,
          noEmit: true,
          esModuleInterop: true,
          resolveJsonModule: true,
          types: ["node"],
        },
        include: ["agent/**/*.ts", "lib/**/*.ts", ".eve/**/*.d.ts"],
      },
      null,
      2,
    ) + "\n",

    ".gitignore": ["node_modules", ".eve", ".env", ".env.*", "!.env.example", "dist"].join(
      "\n",
    ) + "\n",

    ".env.example": ({ stack }) => {
      const lines = [
        "# Model credentials — see https://eve.dev/docs/getting-started",
        "AI_GATEWAY_API_KEY=",
        "",
      ];
      if (stack.store === "github") {
        lines.push(
          "# GitHub Work Item Store",
          "GITHUB_TOKEN=",
          "GITHUB_OWNER=",
          "GITHUB_REPO=",
          "",
        );
      }
      if (stack.store === "linear") {
        lines.push("# Linear Work Item Store", "LINEAR_API_KEY=", "");
      }
      if (stack.channels.includes("slack")) {
        lines.push(
          "# Slack channel — prefer Vercel Connect in production",
          "# See https://eve.dev/docs after `eve channels add slack`",
          "",
        );
      }
      return lines.join("\n");
    },

    "README.md": ({ stack, packageName }) => `# ${packageName}

Software Factory scaffolded by [betterfactory](https://github.com/ikindacodes/betterfactory).

This factory turns intent into **Work Items** (not application code) and gates them **Ready for Handoff** for humans or Coding Agents.

## Graph

| Role | Job |
|------|-----|
| **Root** | Intake, route, policy |
| **Planner** | Plan by writing Work Items to the Store |
| **Reviewer** | Cold-context comment + Ready for Handoff gate |

## Stack

- **Work Item Store:** \`${stack.store}\`
- **Channels:** ${stack.channels.map((c) => `\`${c}\``).join(", ")}

## Quick start

\`create-betterfactory\` already copied \`.env.example\` → \`.env\` and ran install when you scaffolded. Finish setup:

\`\`\`bash
# Fill in AI_GATEWAY_API_KEY (and Store credentials) in .env
pnpm dev       # or: npm run dev / yarn dev / bun run dev
\`\`\`

## Ownership

You own this code. betterfactory only scaffolded it (MIT). Relicense with your Target Repository as you like.
`,

    "agent/agent.ts": `import { defineAgent } from "eve";

export default defineAgent({
  model: "anthropic/claude-sonnet-5",
});
`,

    "agent/instructions.md": `# Identity

You are the **Root** of a Software Factory. You turn user intent into high-quality **Work Items** and route them through Planner and Reviewer. You do **not** write application source code or act as a Coding Agent (Cursor, Grok Build, etc.).

## Roles

- **You (Root):** intake, clarify, route, enforce policy, talk to the user.
- **\`planner\`:** breaks work down and **writes** Work Items to the Work Item Store (create/update bodies).
- **\`reviewer\`:** judges Work Items in a **clean context** (no Planner history). Comments and sets **Ready for Handoff**; does **not** freely rewrite bodies.

## Work Item fields (always)

Title, Context, Outcome, Acceptance criteria, Constraints, Pointers, Handoff notes, Ready for Handoff.

## Flow

1. Understand the user's intent; ask only necessary clarifying questions.
2. Delegate to \`planner\` with a self-contained message (goals, constraints, repo context).
3. After Work Items exist, delegate to \`reviewer\` with the Work Item content/ids only — no Planner chat history.
4. If not ready, send Reviewer feedback back to \`planner\` for revisions (Planner rewrites; Reviewer does not).
5. When Ready for Handoff, tell the user how to pick it up (human or Coding Agent).

## Hard rules

- Never implement application code or open product PRs as your primary job.
- Prefer tools over guessing when the Store or repo facts are needed.
- Pack everything a subagent needs into \`message\` — children do not see your history.
`,

    "agent/channels/eve.ts": `import { eveChannel } from "eve/channels/eve";
import { localDev, placeholderAuth, vercelOidc } from "eve/channels/auth";

export default eveChannel({
  auth: [
    vercelOidc(),
    localDev(),
    placeholderAuth(),
  ],
});
`,

    "agent/skills/definition-of-ready.md": `---
description: Definition of Ready checklist for Work Items before Handoff. Load before planning or reviewing Work Items.
---

# Definition of Ready

A Work Item is Ready for Handoff only when all of the following hold:

${dorList}

## Not in scope for the factory

- Writing or committing application source code
- Acting as a full IDE / Coding Agent harness
`,

    "agent/subagents/planner/agent.ts": `import { defineAgent } from "eve";

export default defineAgent({
  description:
    "Plans by writing Work Items to the Store: breakdown, structure, acceptance criteria, and filing. Does not implement application code.",
  model: "anthropic/claude-sonnet-5",
});
`,

    "agent/subagents/planner/instructions.md": `# Identity

You are the **Planner** in a Software Factory. You plan **by writing Work Items** to the Work Item Store. Filing and structuring are one job — you do not hand prose to a separate "author."

## Output

Each Work Item must include:

- **Title** — one-line outcome
- **Context** — why this exists
- **Outcome** — what done looks like
- **Acceptance criteria** — checkable bullets
- **Constraints** — out of scope / non-goals / safety
- **Pointers** — paths, URLs, repro
- **Handoff notes** — how a stranger or Coding Agent should start

Do **not** set Ready for Handoff yourself unless the user explicitly wants a draft marked ready without review (default: leave not-ready for Reviewer).

## Rules

- Load the Definition of Ready skill when structuring items.
- Use Store tools for create/update. Remote Store writes may require human approval — that is expected.
- Never write application source code or act as a Coding Agent.
- Prefer small, handoff-sized Work Items over epics.
`,

    "agent/subagents/reviewer/agent.ts": `import { defineAgent } from "eve";

export default defineAgent({
  description:
    "Reviews Work Items in a clean context against Definition of Ready. Comments and gates Ready for Handoff; does not freely rewrite Work Item bodies.",
  model: "anthropic/claude-sonnet-5",
});
`,

    "agent/subagents/reviewer/instructions.md": `# Identity

You are the **Reviewer** in a Software Factory. You receive Work Item content (or ids) **without** the Planner's conversation history — a cold read.

## Authority

- **May:** comment, request changes, set or clear **Ready for Handoff** (gate).
- **Must not:** freely rewrite Work Item bodies (Planner owns authoring). You may suggest exact wording in comments for the Planner to apply.

## Process

1. Load Definition of Ready.
2. Score the Work Item against every checklist item.
3. If gaps exist: leave clear comments, ensure Ready for Handoff is **false**, summarize blockers for Root.
4. If ready: set Ready for Handoff **true**, confirm briefly.

## Rules

- Do not invent acceptance criteria as silent edits — comment them for Planner/user agreement.
- Never implement application code.
`,

    "lib/work-item.ts": `/**
 * Canonical Work Item shape used across Work Item Stores.
 */
export type WorkItem = {
  title: string;
  context: string;
  outcome: string;
  acceptanceCriteria: string;
  constraints: string;
  pointers: string;
  handoffNotes: string;
  readyForHandoff: boolean;
};

export const READY_FOR_HANDOFF_LABEL = "ready-for-handoff";

export function formatWorkItemBody(item: Omit<WorkItem, "title" | "readyForHandoff">): string {
  return \`## Context

\${item.context}

## Outcome

\${item.outcome}

## Acceptance criteria

\${item.acceptanceCriteria}

## Constraints

\${item.constraints}

## Pointers

\${item.pointers}

## Handoff notes

\${item.handoffNotes}
\`;
}

export function parseReadyFromLabels(labels: string[] | undefined): boolean {
  return (labels ?? []).some(
    (l) => l.toLowerCase() === READY_FOR_HANDOFF_LABEL,
  );
}
`,
  },
};
