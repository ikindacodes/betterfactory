"use client"

import { useMemo, useState } from "react"
import {
  buildCreateCommand,
  type ChannelId,
  type InstallMode,
  type PackageManager,
  type StackConfig,
  type WorkItemStoreId,
} from "create-betterfactory/modules"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

const STORES: { id: WorkItemStoreId; label: string; hint: string }[] = [
  {
    id: "github",
    label: "GitHub Issues",
    hint: "Default — great for Coding Agent handoff",
  },
  {
    id: "linear",
    label: "Linear",
    hint: "MCP connection; writes need approval",
  },
  {
    id: "markdown",
    label: "Markdown folder",
    hint: "issues/*.md in the factory package",
  },
]

const PACKAGE_MANAGERS: PackageManager[] = ["npm", "pnpm", "bun", "yarn"]

export function StackBuilder() {
  const [name, setName] = useState("my-factory")
  const [installMode, setInstallMode] = useState<InstallMode>("new")
  const [packagePath, setPackagePath] = useState("apps/my-factory")
  const [store, setStore] = useState<WorkItemStoreId>("github")
  const [slack, setSlack] = useState(false)
  const [pm, setPm] = useState<PackageManager>("npm")
  const [copied, setCopied] = useState(false)

  const stack: StackConfig = useMemo(() => {
    const channels: ChannelId[] = ["eve"]
    if (slack) channels.push("slack")
    return {
      name: name.trim() || "my-factory",
      installMode,
      store,
      channels,
      packagePath: installMode === "in-place" ? packagePath : undefined,
    }
  }, [name, installMode, packagePath, store, slack])

  const command = useMemo(
    () => buildCreateCommand(stack, { packageManager: pm }),
    [stack, pm],
  )

  async function copy() {
    try {
      await navigator.clipboard.writeText(command)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignore
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_minmax(0,1.1fr)] lg:gap-10">
      <div className="flex flex-col gap-6">
        <Field label="Factory name">
          <input
            className={inputClass}
            value={name}
            onChange={(e) => {
              const v = e.target.value
              setName(v)
              if (installMode === "in-place" && packagePath.startsWith("apps/")) {
                setPackagePath(`apps/${v.trim() || "my-factory"}`)
              }
            }}
            placeholder="my-factory"
            spellCheck={false}
          />
        </Field>

        <Field label="Install mode">
          <div className="grid gap-2 sm:grid-cols-2">
            <Choice
              active={installMode === "new"}
              title="New directory"
              hint={`./${name || "my-factory"}`}
              onClick={() => setInstallMode("new")}
            />
            <Choice
              active={installMode === "in-place"}
              title="Into this repository"
              hint="Own package tree, not your Next app"
              onClick={() => setInstallMode("in-place")}
            />
          </div>
        </Field>

        {installMode === "in-place" ? (
          <Field label="Path inside Target Repository">
            <input
              className={inputClass}
              value={packagePath}
              onChange={(e) => setPackagePath(e.target.value)}
              placeholder="apps/factory"
              spellCheck={false}
            />
          </Field>
        ) : null}

        <Field label="Work Item Store">
          <div className="grid gap-2">
            {STORES.map((s) => (
              <Choice
                key={s.id}
                active={store === s.id}
                title={s.label}
                hint={s.hint}
                onClick={() => setStore(s.id)}
              />
            ))}
          </div>
        </Field>

        <Field label="Channels">
          <div className="flex flex-col gap-2">
            <div className="border-border bg-muted/40 text-muted-foreground rounded-none border px-3 py-2 text-xs">
              eve TUI / HTTP — always included
            </div>
            <label className="border-border hover:bg-muted/30 flex cursor-pointer items-start gap-3 border px-3 py-3 text-sm transition-colors">
              <input
                type="checkbox"
                className="mt-0.5 size-4 accent-primary"
                checked={slack}
                onChange={(e) => setSlack(e.target.checked)}
              />
              <span>
                <span className="font-medium">Slack</span>
                <span className="text-muted-foreground mt-0.5 block text-xs">
                  Optional surface — finish with{" "}
                  <code className="font-mono">eve channels add slack</code>
                </span>
              </span>
            </label>
          </div>
        </Field>

        <div className="text-muted-foreground text-xs leading-relaxed">
          Default roles are fixed:{" "}
          <span className="text-foreground font-medium">Root</span>,{" "}
          <span className="text-foreground font-medium">Planner</span>,{" "}
          <span className="text-foreground font-medium">Reviewer</span>. The
          factory authors Work Items — it is not a coding harness.
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-semibold tracking-widest uppercase">
            Your command
          </span>
          <div className="flex flex-wrap gap-1">
            {PACKAGE_MANAGERS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setPm(m)}
                className={cn(
                  "border px-2 py-1 font-mono text-[10px] tracking-wide uppercase transition-colors",
                  pm === m
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:bg-muted",
                )}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <pre className="border-border bg-card text-card-foreground overflow-x-auto border p-4 font-mono text-xs leading-relaxed break-all whitespace-pre-wrap sm:text-sm">
          {command}
        </pre>

        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={copy}>
            {copied ? "Copied" : "Copy command"}
          </Button>
          <Button
            variant="outline"
            nativeButton={false}
            render={
              <a
                href="https://github.com/ikindacodes/betterfactory"
                target="_blank"
                rel="noreferrer"
              />
            }
          >
            GitHub
          </Button>
        </div>

        <ol className="text-muted-foreground list-decimal space-y-1 pl-4 text-xs leading-relaxed">
          <li>Run the command in your terminal (or Target Repository root).</li>
          <li>
            <code className="text-foreground font-mono">cp .env.example .env</code>{" "}
            and add model + Store credentials.
          </li>
          <li>
            <code className="text-foreground font-mono">pnpm install && pnpm dev</code>{" "}
            — talk to Root in the eve TUI.
          </li>
        </ol>
      </div>
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-xs font-semibold tracking-widest uppercase">
        {label}
      </div>
      {children}
    </div>
  )
}

function Choice({
  active,
  title,
  hint,
  onClick,
}: {
  active: boolean
  title: string
  hint: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-none border px-3 py-3 text-left transition-colors",
        active
          ? "border-primary bg-primary/5"
          : "border-border hover:bg-muted/40",
      )}
    >
      <div className="text-sm font-medium">{title}</div>
      <div className="text-muted-foreground mt-0.5 text-xs">{hint}</div>
    </button>
  )
}

const inputClass =
  "border-border bg-background text-foreground placeholder:text-muted-foreground focus-visible:ring-ring/30 w-full rounded-none border px-3 py-2 font-mono text-sm outline-none focus-visible:ring-2"
