"use client"

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import {
  buildCreateCommand,
  type ChannelId,
  type InstallMode,
  type PackageManager,
  type StackConfig,
  type WorkItemStoreId,
} from "create-betterfactory/modules"
import { SiteHeader } from "@/components/site-header"
import { StackPreviewTree } from "@/components/stack-preview-tree"
import {
  clearStackSelections,
  DEFAULT_STACK_SELECTIONS,
  loadStackSelections,
  saveStackSelections,
  finalizeFactoryName,
  sanitizeFactoryNameInput,
  type StackBuilderSelections,
} from "@/lib/stack-builder-storage"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@workspace/ui/components/alert-dialog"
import { Button } from "@workspace/ui/components/button"
import { Checkbox } from "@workspace/ui/components/checkbox"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import {
  RadioGroup,
  RadioGroupItem,
} from "@workspace/ui/components/radio-group"
import { Kbd } from "@workspace/ui/components/kbd"
import { ScrollArea } from "@workspace/ui/components/scroll-area"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group"
const STORES: {
  id: WorkItemStoreId
  label: string
  hint: string
}[] = [
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

/** Boxed mono input for factory slug / path — denser than sera underline. */
const monoInputClass =
  "h-10 border-border bg-background font-mono text-sm border border-b-border px-3 py-2 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"

export function StackBuilder() {
  const [selections, setSelections] = useState<StackBuilderSelections>(
    DEFAULT_STACK_SELECTIONS,
  )
  const [ready, setReady] = useState(false)
  const [copied, setCopied] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const copyTimeoutRef = useRef<number | null>(null)

  useLayoutEffect(() => {
    setSelections(loadStackSelections())
    setReady(true)
  }, [])

  useEffect(() => {
    if (!ready) return
    saveStackSelections(selections)
  }, [selections, ready])

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current !== null) {
        window.clearTimeout(copyTimeoutRef.current)
      }
    }
  }, [])

  const { name, installMode, packagePath, store, slack, pm } = selections

  function patch(partial: Partial<StackBuilderSelections>) {
    setSelections((prev) => ({ ...prev, ...partial }))
  }

  function resetToDefaults() {
    clearStackSelections()
    setSelections({ ...DEFAULT_STACK_SELECTIONS })
    setCopied(false)
    setResetOpen(false)
  }

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
      if (copyTimeoutRef.current !== null) {
        window.clearTimeout(copyTimeoutRef.current)
      }
      copyTimeoutRef.current = window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignore
    }
  }

  function syncPackagePathFromName(nextName: string) {
    if (installMode === "in-place" && packagePath.startsWith("apps/")) {
      return `apps/${nextName || "my-factory"}`
    }
    return undefined
  }

  if (!ready) {
    return <StackBuilderShell />
  }

  const resetAction = (
    <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
      <AlertDialogTrigger
        render={
          <Button type="button" variant="outline" size="sm" className="shrink-0" />
        }
      >
        Reset
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reset selections?</AlertDialogTitle>
          <AlertDialogDescription>
            This clears your saved Stack Builder choices in this browser and
            restores the defaults (name, package manager, install mode, store,
            and channels).
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={resetToDefaults}>Reset</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )

  return (
    <div className="border-border flex h-full w-full flex-col overflow-hidden border-0 pt-[env(safe-area-inset-top)] pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)]">
      <SiteHeader actions={resetAction} />

      <div className="grid min-h-0 flex-1 overflow-hidden lg:grid-cols-[minmax(18rem,24rem)_minmax(0,1fr)]">
        <aside
          className="border-border flex min-h-0 flex-col overflow-hidden border-b lg:border-r lg:border-b-0"
          aria-label="Stack options"
        >
          <ScrollArea
            className="min-h-0 flex-1"
            viewportClassName="scroll-fade overscroll-contain"
          >
            <div className="p-4">
              <FieldGroup className="gap-6">
              <Field>
                <FieldLabel htmlFor="factory-name">Factory name</FieldLabel>
                <Input
                  id="factory-name"
                  name="factory-name"
                  className={monoInputClass}
                  value={name}
                  onChange={(e) => {
                    const v = sanitizeFactoryNameInput(e.target.value)
                    const next: Partial<StackBuilderSelections> = { name: v }
                    const path = syncPackagePathFromName(v)
                    if (path) next.packagePath = path
                    patch(next)
                  }}
                  onBlur={() => {
                    const v = finalizeFactoryName(name)
                    if (v === name) return
                    const next: Partial<StackBuilderSelections> = { name: v }
                    const path = syncPackagePathFromName(v)
                    if (path) next.packagePath = path
                    patch(next)
                  }}
                  placeholder="my-factory"
                  autoComplete="off"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  translate="no"
                />
              </Field>

              <Field>
                <FieldTitle id="pm-label">Package manager</FieldTitle>
                <ToggleGroup
                  aria-labelledby="pm-label"
                  value={[pm]}
                  onValueChange={(vals) => {
                    const next = vals[0] as PackageManager | undefined
                    if (next) patch({ pm: next })
                  }}
                  variant="outline"
                  size="sm"
                  spacing={1}
                  className="flex-wrap"
                >
                  {PACKAGE_MANAGERS.map((m) => (
                    <ToggleGroupItem
                      key={m}
                      value={m}
                      className="font-mono text-[10px] tracking-wide uppercase"
                    >
                      {m}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </Field>

              <FieldSet className="gap-3">
                <FieldLegend variant="label">Install mode</FieldLegend>
                <RadioGroup
                  value={installMode}
                  onValueChange={(value) =>
                    patch({ installMode: value as InstallMode })
                  }
                  className="grid gap-2"
                >
                  <FieldLabel htmlFor="install-new">
                    <Field orientation="horizontal">
                      <RadioGroupItem value="new" id="install-new" />
                      <FieldContent>
                        <FieldTitle>New directory</FieldTitle>
                        <FieldDescription>
                          ./{name || "my-factory"}
                        </FieldDescription>
                      </FieldContent>
                    </Field>
                  </FieldLabel>
                  <FieldLabel htmlFor="install-in-place">
                    <Field orientation="horizontal">
                      <RadioGroupItem value="in-place" id="install-in-place" />
                      <FieldContent>
                        <FieldTitle>Into this repository</FieldTitle>
                        <FieldDescription>
                          Own package tree, not your Next app
                        </FieldDescription>
                      </FieldContent>
                    </Field>
                  </FieldLabel>
                </RadioGroup>
              </FieldSet>

              {installMode === "in-place" ? (
                <Field>
                  <FieldLabel htmlFor="package-path">
                    Path inside Target Repository
                  </FieldLabel>
                  <Input
                    id="package-path"
                    name="package-path"
                    className={monoInputClass}
                    value={packagePath}
                    onChange={(e) => patch({ packagePath: e.target.value })}
                    placeholder="apps/factory"
                    autoComplete="off"
                    spellCheck={false}
                    translate="no"
                  />
                </Field>
              ) : null}

              <FieldSet className="gap-3">
                <FieldLegend variant="label">Work Item Store</FieldLegend>
                <RadioGroup
                  value={store}
                  onValueChange={(value) =>
                    patch({ store: value as WorkItemStoreId })
                  }
                  className="grid gap-2"
                >
                  {STORES.map((s) => (
                    <FieldLabel key={s.id} htmlFor={`store-${s.id}`}>
                      <Field orientation="horizontal">
                        <RadioGroupItem value={s.id} id={`store-${s.id}`} />
                        <FieldContent>
                          <FieldTitle>{s.label}</FieldTitle>
                          <FieldDescription>{s.hint}</FieldDescription>
                        </FieldContent>
                      </Field>
                    </FieldLabel>
                  ))}
                </RadioGroup>
              </FieldSet>

              <FieldSet className="gap-3">
                <FieldLegend variant="label">Channels</FieldLegend>
                <div className="flex flex-col gap-2">
                  <div className="border-border bg-muted/40 text-muted-foreground border px-3 py-2.5 text-xs">
                    eve TUI / HTTP — always included
                  </div>
                  <FieldLabel htmlFor="channel-slack">
                    <Field orientation="horizontal">
                      <Checkbox
                        id="channel-slack"
                        name="channel-slack"
                        checked={slack}
                        onCheckedChange={(checked) =>
                          patch({ slack: checked === true })
                        }
                      />
                      <FieldContent>
                        <FieldTitle>Slack</FieldTitle>
                        <FieldDescription>
                          After install run{" "}
                          <Kbd className="font-mono" translate="no">
                            eve channels add slack
                          </Kbd>
                        </FieldDescription>
                      </FieldContent>
                    </Field>
                  </FieldLabel>
                </div>
              </FieldSet>
            </FieldGroup>
            </div>
          </ScrollArea>

          <div className="border-border bg-muted/20 flex shrink-0 flex-col gap-3 border-t p-4">
            <div className="text-[10px] font-semibold tracking-widest uppercase">
              Your command
            </div>
            <pre
              className="border-border bg-card max-h-28 overflow-auto border p-3 font-mono text-[11px] leading-relaxed break-all whitespace-pre-wrap"
              translate="no"
            >
              {command}
            </pre>
            <Button
              type="button"
              className="w-full"
              onClick={copy}
              aria-label={
                copied ? "Command copied to clipboard" : "Copy create command"
              }
            >
              {copied ? "Copied" : "Copy command"}
            </Button>
            <span className="sr-only" aria-live="polite">
              {copied ? "Command copied to clipboard" : ""}
            </span>
          </div>
        </aside>

        <div
          className="bg-background flex min-h-0 flex-col overflow-hidden p-4"
          aria-label="Install preview"
        >
          <StackPreviewTree stack={stack} className="min-h-0 flex-1" />
        </div>
      </div>
    </div>
  )
}

function StackBuilderShell() {
  return (
    <div
      className="border-border flex h-full w-full flex-col overflow-hidden border-0 pt-[env(safe-area-inset-top)] pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)]"
      aria-busy
      aria-label="Loading saved selections"
    >
      <SiteHeader
        actions={
          <div className="border-border h-9 w-[4.5rem] border opacity-40" />
        }
      />
      <div className="grid min-h-0 flex-1 overflow-hidden lg:grid-cols-[minmax(18rem,24rem)_minmax(0,1fr)]">
        <aside className="border-border border-b lg:border-r lg:border-b-0" />
        <div className="bg-background" />
      </div>
    </div>
  )
}
