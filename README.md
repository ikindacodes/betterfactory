# betterfactory

**create-next-app energy for Software Factories** — open source, composable, owned completely by you.

Scaffold an [eve](https://eve.dev) agent graph that turns intent into **tickets** and gates them **Ready for Handoff** for humans or Coding Agents (Cursor, Grok Build, cloud agents). It is **not** a coding harness and does **not** host your factory as a multi-tenant service.

```bash
npx create-betterfactory@latest
```

Or compose the command visually with the **Stack Builder**:

```bash
pnpm --filter create-betterfactory build
pnpm --filter web dev
# open http://localhost:3000 → Stack Builder
```

## What you get

| Piece | Role |
|-------|------|
| **Root** | Intake, route, policy |
| **Planner** | Plans *by writing* tickets |
| **Reviewer** | Cold-context comment + Ready for Handoff gate |

**Tickets (Stack choice):** GitHub Issues (default), Linear, or `tickets/*.md`.  
**Channels:** eve TUI/HTTP always; optional Slack.  
**Install:** new directory or in-place into your Target Repository (own package tree).

## Monorepo

```text
packages/create-betterfactory   # CLI, Wizard, Module catalog + recipes
apps/web                        # landing + Stack Builder
```

Planning docs (`CONTEXT.md`, `docs/adr/`) stay local / gitignored.

### Develop locally

```bash
pnpm install
pnpm --filter create-betterfactory build

# Interactive
pnpm --filter create-betterfactory start

# Non-interactive dry-run
node packages/create-betterfactory/dist/cli.js my-factory -y --tickets markdown --dry-run

# List modules
node packages/create-betterfactory/dist/cli.js --list-modules
```

### Create a factory into `/tmp`

```bash
node packages/create-betterfactory/dist/cli.js demo-factory -y --tickets markdown
cd demo-factory && pnpm install && pnpm dev
```

## Product boundaries

- Composition-first Wizard (not a thin `eve init` wrapper)
- Factory is not a coding harness
- Ticket backend is a Stack choice
- Default graph: Root + Planner + Reviewer
- MIT license; generated factories are yours

## Publishing

One public package: **`create-betterfactory`**.

```bash
# from repo root (requires npm login)
pnpm run publish:cli
```

CLI README (shown on npm): [`packages/create-betterfactory/README.md`](./packages/create-betterfactory/README.md)

## License

MIT
