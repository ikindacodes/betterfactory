"use client"

import { useState } from "react"
import { Copy01Icon, Tick02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { cn } from "@workspace/ui/lib/utils"

const COMMAND = "npx create-betterfactory@latest"

export function CopyableCommand({
  command = COMMAND,
  className,
}: {
  command?: string
  className?: string
}) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(command)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignore clipboard failures (insecure context, permissions)
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? "Copied to clipboard" : `Copy \`${command}\``}
      className={cn(
        "border-border bg-card text-card-foreground group relative inline-flex max-w-full items-center gap-3 border px-3 py-2 font-mono text-xs transition-colors sm:text-sm",
        "hover:bg-muted/60 focus-visible:border-ring focus-visible:ring-ring/30 focus-visible:ring-2 focus-visible:outline-none",
        "active:translate-y-px",
        className,
      )}
    >
      <span className="text-muted-foreground select-none" aria-hidden>
        $
      </span>
      <code className="min-w-0 truncate text-left">{command}</code>
      <span
        className={cn(
          "text-muted-foreground ml-auto inline-flex size-7 shrink-0 items-center justify-center transition-colors",
          copied ? "text-foreground" : "group-hover:text-foreground",
        )}
        aria-hidden
      >
        <HugeiconsIcon
          icon={copied ? Tick02Icon : Copy01Icon}
          size={14}
          strokeWidth={2}
        />
      </span>
      <span className="sr-only" aria-live="polite">
        {copied ? "Copied" : ""}
      </span>
    </button>
  )
}
