# create-betterfactory

**create-next-app energy for Software Factories** — open source, composable, owned completely by you.

Scaffold an [eve](https://eve.dev) agent graph that turns intent into **tickets** and gates them **Ready for Handoff** for humans or Coding Agents (Cursor, Grok Build, cloud agents).

It is **not** a coding harness and does **not** host your factory as a multi-tenant service. You own the generated package.

```bash
npx create-betterfactory@latest
```

## Quick start

After scaffolding, the CLI **copies `.env.example` → `.env`** and runs **dependency install** with your package manager (auto-detected from `pnpm create` / `yarn create` / `bunx`, or chosen in the wizard / via `--pm`).

```bash
# Interactive wizard (asks for package manager)
npx create-betterfactory@latest

# Non-interactive defaults (GitHub Issues tickets, new directory, npm install)
npx create-betterfactory@latest my-factory -y

# Prefer pnpm
npx create-betterfactory@latest my-factory -y --pm pnpm
# or
pnpm create betterfactory@latest my-factory -y

# Pick an AI Gateway model (wired into Root / Planner / Reviewer)
npx create-betterfactory@latest my-factory -y --model openai/gpt-5.4

# Markdown tickets, dry-run (print files only — no write/install)
npx create-betterfactory@latest my-factory -y --tickets markdown --dry-run

# Into an existing monorepo
npx create-betterfactory@latest my-factory -y \
  --install in-place \
  --package-path apps/my-factory

# Scaffold files only
npx create-betterfactory@latest my-factory -y --skip-install --skip-env
```

### Package managers

```bash
npx create-betterfactory@latest
pnpm create betterfactory@latest
yarn create betterfactory
bun create create-betterfactory@latest
```

## Options

| Flag | Description |
|------|-------------|
| `[name]` | Factory name / directory |
| `-y, --yes` | Non-interactive defaults |
| `--tickets <tickets>` | `github` (default), `linear`, or `markdown` |
| `--channel <list>` | Extra channels, comma-separated (e.g. `slack`) |
| `--install <mode>` | Scaffold mode: `new` (default) or `in-place` |
| `--package-path <path>` | Path for in-place install (default `apps/<name>`) |
| `--pm <pm>` | `npm` \| `pnpm` \| `yarn` \| `bun` (auto-detect if omitted) |
| `--model <model>` | AI Gateway model for Root/Planner/Reviewer (`provider/model`, default `xai/grok-4.5`) |
| `--skip-install` | Do not run dependency install |
| `--skip-env` | Do not copy `.env.example` → `.env` |
| `--no-shell` | Skip opening a shell in a new factory directory after scaffold |
| `--force` | Overwrite an existing `agent/` tree |
| `--dry-run` | Compose stack and list files without writing |
| `--list-modules` | List Module catalog and exit |

## What you get

| Piece | Role |
|-------|------|
| **Root** | Intake, route, policy |
| **Planner** | Plans *by writing* tickets |
| **Reviewer** | Cold-context review + **Ready for Handoff** gate |

**Tickets:** GitHub Issues (default), Linear, or `tickets/*.md`.  
**Channels:** eve TUI/HTTP always; optional Slack (auto-runs `eve channels add slack -y` after install).  
**Install:** new directory or in-place into your Target Repository.

After a **new directory** scaffold on a TTY, the CLI opens a shell **in** the factory package (so you do not need to `cd` yourself). Use `--no-shell` to skip. Type `exit` to leave that shell.

`.env` is already created — add `AI_GATEWAY_API_KEY` (and ticket backend creds), then:

```bash
pnpm dev        # or npm run dev / yarn dev / bun run dev
```

## Programmatic use

The package also exports the module catalog and command builder (used by the Stack Builder landing site):

```ts
import {
  buildCreateCommand,
  composeStack,
  listCatalog,
  type StackConfig,
} from "create-betterfactory";

// Or tree-shake-friendly:
import { buildCreateCommand } from "create-betterfactory/modules";

const stack: StackConfig = {
  name: "my-factory",
  installMode: "new",
  tickets: "github",
  channels: ["eve"],
};

console.log(buildCreateCommand(stack)); // npx create-betterfactory@latest …
const files = composeStack(stack);      // Record<path, contents>
```

## Requirements

- Node.js **≥ 20**
- An [AI Gateway](https://vercel.com/docs/ai-gateway) / model credentials for running the generated factory (see generated `.env.example`)

## License

MIT — the scaffold CLI and the factories you generate are yours.

Repo: [github.com/ikindacodes/betterfactory](https://github.com/ikindacodes/betterfactory)
