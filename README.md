# betterfactory

**create-next-app energy for Software Factories** — open source, composable, owned completely by you.

Scaffold an [eve](https://eve.dev) agent graph that turns intent into **Work Items** and gates them **Ready for Handoff** for humans or Coding Agents (Cursor, Grok Build, cloud agents). It is **not** a coding harness and does **not** host your factory as a multi-tenant service.

```bash
npx create-betterfactory@latest
```

Or compose the command visually with the **Stack Builder**:

```bash
pnpm --filter @betterfactory/modules build
pnpm --filter web dev
# open http://localhost:3000 → Stack Builder
```

## What you get

| Piece | Role |
|-------|------|
| **Root** | Intake, route, policy |
| **Planner** | Plans *by writing* Work Items to your Store |
| **Reviewer** | Cold-context comment + Ready for Handoff gate |

**Work Item Stores (Stack choice):** GitHub Issues (default), Linear, or `issues/*.md`.  
**Channels:** eve TUI/HTTP always; optional Slack.  
**Install:** new directory or in-place into your Target Repository (own package tree).

## Monorepo

```text
packages/create-betterfactory   # CLI / Wizard
packages/modules                # shared Module catalog (CLI + Stack Builder)
apps/web                        # landing + Stack Builder
CONTEXT.md                      # domain language
docs/adr/                       # architecture decisions
```

### Develop locally

```bash
pnpm install
pnpm --filter @betterfactory/modules build
pnpm --filter create-betterfactory build

# Interactive
pnpm --filter create-betterfactory start

# Non-interactive dry-run
node packages/create-betterfactory/dist/cli.js my-factory -y --store markdown --dry-run

# List modules
node packages/create-betterfactory/dist/cli.js --list-modules
```

### Create a factory into `/tmp`

```bash
node packages/create-betterfactory/dist/cli.js demo-factory -y --store markdown
cd demo-factory && pnpm install && pnpm dev
```

## Product boundaries

See [`CONTEXT.md`](./CONTEXT.md) and [`docs/adr/`](./docs/adr/). Highlights:

- Composition-first Wizard (not a thin `eve init` wrapper)
- Factory is not a coding harness
- Work Item Store is a Stack choice
- Default graph: Root + Planner + Reviewer
- MIT license; generated factories are yours

## Publishing npm packages

See [docs/publishing.md](./docs/publishing.md). Short version (requires `npm login` and the `@betterfactory` npm org):

```bash
pnpm run publish:packages
```

## License

MIT
