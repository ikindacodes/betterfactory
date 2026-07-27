import type { ModuleRecipe } from "../types.js";
import { DEFINITION_OF_READY_CHECKLIST } from "../work-item.js";

const dorList = DEFINITION_OF_READY_CHECKLIST.map((c) => `- [ ] ${c}`).join(
  "\n",
);

/** Shared Ready for Handoff skill — Root, Planner, and Reviewer each get a copy (subagents do not inherit root skills). */
const checkReadyForHandoffSkill = `---
description: Check Ready for Handoff. Use when structuring a ticket for filing, or when gating Ready for Handoff.
---

# Check Ready for Handoff

Score the ticket against every bar below. **Done** when each bar is pass or fail with a one-line reason.

## Bars (all required for Ready for Handoff)

${dorList}

## Branches

### Structure (Planner)

Author Title, Context, Outcome, Acceptance criteria, Constraints, Pointers, and Handoff notes so every bar can pass. Leave Ready for Handoff false — Reviewer gates.

### Gate (Reviewer)

Cold-read only (no Planner history). Comment failures; set Ready for Handoff true only when every bar passes. Suggest wording in comments — Planner rewrites bodies.

## Boundary

Ship tickets and gates. Humans and Coding Agents execute application code outside this factory.
`;

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
      if (stack.tickets === "github") {
        lines.push(
          "# GitHub tickets (Issues API)",
          "GITHUB_TOKEN=",
          "GITHUB_OWNER=",
          "GITHUB_REPO=",
          "",
        );
      }
      if (stack.tickets === "linear") {
        lines.push("# Linear tickets", "LINEAR_API_KEY=", "");
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

This factory turns intent into **tickets** (not application code) and gates them **Ready for Handoff** for humans or Coding Agents.

## Graph

| Role | Job |
|------|-----|
| **Root** | Intake, route, policy |
| **Planner** | Plan by writing tickets |
| **Reviewer** | Cold-context comment + Ready for Handoff gate |

## Stack

- **Tickets:** \`${stack.tickets}\`
- **Channels:** ${stack.channels.map((c) => `\`${c}\``).join(", ")}

## Quick start

\`create-betterfactory\` already copied \`.env.example\` → \`.env\` and ran install when you scaffolded. Finish setup:

\`\`\`bash
# Fill in AI_GATEWAY_API_KEY (and ticket backend credentials) in .env
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

You are the **Root** of a Software Factory. You turn user intent into high-quality **tickets** and route them through Planner and Reviewer. You do **not** write application source code or act as a Coding Agent (Cursor, Grok Build, etc.).

## Roles

- **You (Root):** intake, clarify, route, enforce policy, talk to the user.
- **\`planner\`:** breaks work down and **writes** tickets (create/update bodies).
- **\`reviewer\`:** judges tickets in a **clean context** (no Planner history). Comments and sets **Ready for Handoff**; Planner rewrites bodies.

## Ticket fields (always)

Title, Context, Outcome, Acceptance criteria, Constraints, Pointers, Handoff notes, Ready for Handoff.

## Flow

1. Understand the user's intent; ask only necessary clarifying questions.
2. Delegate to \`planner\` with a self-contained message (goals, constraints, repo context).
3. After tickets exist, delegate to \`reviewer\` with the ticket content/ids only — no Planner chat history.
4. If not ready, send Reviewer feedback back to \`planner\` for revisions (Planner rewrites; Reviewer does not).
5. When Ready for Handoff, tell the user how to pick it up (human or Coding Agent).

## Hard rules

- Ship tickets and gates — humans and Coding Agents execute application code.
- Prefer tools over guessing when ticket or repo facts are needed.
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

    "agent/skills/check-ready-for-handoff.md": checkReadyForHandoffSkill,
    "agent/subagents/planner/skills/check-ready-for-handoff.md": checkReadyForHandoffSkill,
    "agent/subagents/reviewer/skills/check-ready-for-handoff.md": checkReadyForHandoffSkill,

    "agent/subagents/planner/agent.ts": `import { defineAgent } from "eve";

export default defineAgent({
  description:
    "Plans by writing tickets: breakdown, structure, acceptance criteria, and filing. Ships tickets — not application code.",
  model: "anthropic/claude-sonnet-5",
});
`,

    "agent/subagents/planner/instructions.md": `# Identity

You are the **Planner** in a Software Factory. You plan **by writing tickets**. Filing and structuring are one job — you do not hand prose to a separate "author."

## Output

Each ticket must include:

- **Title** — one-line outcome
- **Context** — why this exists
- **Outcome** — what done looks like
- **Acceptance criteria** — checkable bullets
- **Constraints** — out of scope / non-goals / safety
- **Pointers** — paths, URLs, repro
- **Handoff notes** — how a stranger or Coding Agent should start

Leave Ready for Handoff false for Reviewer unless the user explicitly wants a draft marked ready without review.

## Rules

- Load \`check-ready-for-handoff\` when structuring tickets; every bar must be able to pass.
- Use ticket tools for create/update (\`create_ticket\`, \`update_ticket\`, etc.). Remote writes may require human approval — that is expected.
- Prefer small, handoff-sized tickets over epics.
- Ship tickets only — humans and Coding Agents execute application code.
`,

    "agent/subagents/reviewer/agent.ts": `import { defineAgent } from "eve";

export default defineAgent({
  description:
    "Reviews tickets cold against Ready for Handoff. Comments and gates readiness; Planner rewrites bodies.",
  model: "anthropic/claude-sonnet-5",
});
`,

    "agent/subagents/reviewer/instructions.md": `# Identity

You are the **Reviewer** in a Software Factory. You receive ticket content (or ids) **without** the Planner's conversation history — a cold read.

## Authority

- Comment, request changes, set or clear **Ready for Handoff** (gate).
- Suggest exact wording in comments; Planner owns body rewrites.

## Process

1. Load \`check-ready-for-handoff\`.
2. Score every bar (pass/fail + one-line reason).
3. Gaps: comment blockers (\`comment_ticket\`), Ready for Handoff **false**, summarize for Root.
4. All pass: Ready for Handoff **true** (\`set_ready_for_handoff\`), confirm briefly.

## Rules

- Comment missing acceptance criteria for Planner/user agreement — leave bodies to Planner.
- Ship gates and comments only — humans and Coding Agents execute application code.
`,

    "lib/ticket.ts": `/**
 * Canonical ticket shape used across ticket backends (GitHub, Linear, markdown).
 */
export type Ticket = {
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

export function formatTicketBody(item: Omit<Ticket, "title" | "readyForHandoff">): string {
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
