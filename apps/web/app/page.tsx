import { CopyableCommand } from "@/components/copyable-command"
import { StackBuilder } from "@/components/stack-builder"
import { Button } from "@workspace/ui/components/button"

export default function Page() {
  return (
    <div className="bg-background text-foreground min-h-svh">
      <header className="border-border border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
          <div className="font-mono text-sm font-semibold tracking-tight">
            betterfactory
          </div>
          <nav className="flex items-center gap-3 text-xs font-semibold tracking-widest uppercase">
            <a
              href="#stack-builder"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Stack Builder
            </a>
            <a
              href="https://github.com/ikindacodes/betterfactory"
              className="text-muted-foreground hover:text-foreground transition-colors"
              target="_blank"
              rel="noreferrer"
            >
              GitHub
            </a>
          </nav>
        </div>
      </header>

      <main>
        <section className="border-border border-b">
          <div className="mx-auto grid max-w-5xl gap-10 px-6 py-16 md:py-24 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div className="flex flex-col gap-6">
              <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
                Open source · composable · yours
              </p>
              <h1 className="text-4xl leading-tight font-medium tracking-tight text-balance md:text-5xl">
                create-next-app energy for{" "}
                <span className="underline decoration-primary/40 decoration-4 underline-offset-4">
                  Software Factories
                </span>
              </h1>
              <p className="text-muted-foreground max-w-xl text-base leading-relaxed text-pretty md:text-lg">
                Scaffold an eve agent graph that turns intent into Work Items and
                gates them Ready for Handoff — for humans and Coding Agents. Not a
                coding harness. Not a hosted tenant. Ordinary code in{" "}
                <em>your</em> repository.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button
                  nativeButton={false}
                  render={<a href="#stack-builder" />}
                >
                  Open Stack Builder
                </Button>
                <CopyableCommand />
              </div>
            </div>

            <div className="border-border bg-muted/20 grid gap-3 border p-5 text-sm">
              <Row k="Root" v="Intake, route, policy" />
              <Row k="Planner" v="Plans by writing Work Items" />
              <Row k="Reviewer" v="Cold-context Ready for Handoff gate" />
              <Row k="Store" v="GitHub · Linear · markdown" />
              <Row k="You" v="Own the files, credentials, behavior" />
            </div>
          </div>
        </section>

        <section id="stack-builder" className="scroll-mt-8">
          <div className="mx-auto max-w-5xl px-6 py-16 md:py-20">
            <div className="mb-10 flex flex-col gap-3">
              <h2 className="text-2xl font-medium tracking-tight md:text-3xl">
                Stack Builder
              </h2>
              <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed md:text-base">
                Pick Install mode, Work Item Store, and Channels — same axes as the
                CLI Wizard. Copy a command; nothing runs in our cloud.
              </p>
            </div>
            <StackBuilder />
          </div>
        </section>

        <section className="border-border border-t">
          <div className="mx-auto grid max-w-5xl gap-8 px-6 py-16 md:grid-cols-3">
            <Pillar
              title="Composable"
              body="Modules assemble from your Stack — like Better T-Stack, for factories instead of web apps."
            />
            <Pillar
              title="Not a coding agent"
              body="Output is Work Items with Definition of Ready. Cursor, Grok Build, and teammates execute."
            />
            <Pillar
              title="Owned by you"
              body="Install into a new directory or your monorepo. MIT scaffold. Your Target Repository, your rules."
            />
          </div>
        </section>
      </main>

      <footer className="border-border text-muted-foreground border-t py-8 text-center text-xs">
        MIT · betterfactory ·{" "}
        <a
          className="hover:text-foreground underline-offset-4 hover:underline"
          href="https://eve.dev"
          target="_blank"
          rel="noreferrer"
        >
          built on eve
        </a>
      </footer>
    </div>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border/60 pb-2 last:border-0 last:pb-0">
      <span className="font-mono text-xs font-semibold tracking-wide uppercase">
        {k}
      </span>
      <span className="text-muted-foreground text-right text-xs">{v}</span>
    </div>
  )
}

function Pillar({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold tracking-wide uppercase">{title}</h3>
      <p className="text-muted-foreground text-sm leading-relaxed">{body}</p>
    </div>
  )
}
