"use client"

import type { ReactNode } from "react"
import { GitHubIcon, XIcon } from "@/components/icons"
import { SITE } from "@/lib/site"
import { ModeToggle } from "@/components/mode-toggle"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

type SiteHeaderProps = {
  /** Right-side actions before social links (e.g. Reset). */
  actions?: ReactNode
  className?: string
}

export function SiteHeader({ actions, className }: SiteHeaderProps) {
  return (
    <header
      className={cn(
        "border-border flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3 sm:px-6",
        className,
      )}
    >
      <h1
        className={cn(
          "flex min-w-0 items-center gap-2 text-base font-normal tracking-wide",
          "[font-family:var(--font-geist-pixel-square),var(--font-mono),ui-monospace,monospace]",
        )}
      >
        <span className="shrink-0">{SITE.name}</span>
        <span
          className="text-muted-foreground shrink-0 select-none"
          aria-hidden
        >
          /
        </span>
        <span className="text-muted-foreground truncate">{SITE.tagline}</span>
      </h1>

      <div className="flex items-center gap-1">
        {actions}
        <Button
          variant="ghost"
          size="icon-sm"
          nativeButton={false}
          render={
            <a
              href={SITE.github}
              target="_blank"
              rel="noreferrer"
              aria-label="GitHub repository"
            />
          }
        >
          <GitHubIcon className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          nativeButton={false}
          render={
            <a
              href={SITE.x}
              target="_blank"
              rel="noreferrer"
              aria-label="X profile"
            />
          }
        >
          <XIcon className="size-4" />
        </Button>
        <ModeToggle />
      </div>
    </header>
  )
}
