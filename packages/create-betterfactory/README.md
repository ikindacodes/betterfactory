# create-betterfactory

**create-next-app energy for Software Factories** — open source, composable, owned completely by you.

Scaffold an [eve](https://eve.dev) agent graph that turns intent into **Work Items** and gates them **Ready for Handoff** for humans or Coding Agents (Cursor, Grok Build, cloud agents).

It is **not** a coding harness and does **not** host your factory as a multi-tenant service. You own the generated package.

```bash
npx create-betterfactory@latest
```

## Quick start

```bash
# Interactive wizard
npx create-betterfactory@latest

# Non-interactive defaults (GitHub Issues store, new directory)
npx create-betterfactory@latest my-factory -y

# Markdown Work Item store, dry-run (print files only)
npx create-betterfactory@latest my-factory -y --store markdown --dry-run

# Into an existing monorepo
npx create-betterfactory@latest my-factory -y \
  --install in-place \
  --package-path apps/my-factory
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
| `--store <store>` | `github` (default), `linear`, or `markdown` |
| `--channel <list>` | Extra channels, comma-separated (e.g. `slack`) |
| `--install <mode>` | `new` (default) or `in-place` |
| `--package-path <path>` | Path for in-place install (default `apps/<name>`) |
| `--force` | Overwrite an existing `agent/` tree |
| `--dry-run` | Compose stack and list files without writing |
| `--list-modules` | List Module catalog and exit |

## What you get

| Piece | Role |
|-------|------|
| **Root** | Intake, route, policy |
| **Planner** | Plans *by writing* Work Items to your Store |
| **Reviewer** | Cold-context review + **Ready for Handoff** gate |

**Work Item Stores:** GitHub Issues (default), Linear, or `issues/*.md`.  
**Channels:** eve TUI/HTTP always; optional Slack.  
**Install:** new directory or in-place into your Target Repository.

After scaffolding:

```bash
cd my-factory   # or your --package-path
cp .env.example .env
pnpm install    # or npm / yarn / bun
pnpm dev        # eve TUI
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
  store: "github",
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
