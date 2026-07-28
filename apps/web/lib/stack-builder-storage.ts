import type {
  InstallMode,
  PackageManager,
  TicketsId,
} from "create-betterfactory/modules"
import { DEFAULT_MODEL, isModelId } from "create-betterfactory/modules"

export const STACK_BUILDER_STORAGE_KEY = "betterfactory.stack-builder.v1"

export type StackBuilderSelections = {
  name: string
  installMode: InstallMode
  packagePath: string
  tickets: TicketsId
  slack: boolean
  pm: PackageManager
  /** AI Gateway `provider/model` for Root / Planner / Reviewer. */
  model: string
}

export const DEFAULT_STACK_SELECTIONS: StackBuilderSelections = {
  name: "my-factory",
  installMode: "new",
  packagePath: "apps/my-factory",
  tickets: "github",
  slack: false,
  pm: "npm",
  model: DEFAULT_MODEL,
}

const INSTALL_MODES = new Set<InstallMode>(["new", "in-place"])
const TICKETS = new Set<TicketsId>(["github", "linear", "markdown"])
const PMS = new Set<PackageManager>(["npm", "pnpm", "bun", "yarn"])

function asString(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback
}

/**
 * Directory / package segment: lowercase letters, digits, hyphens only.
 *
 * UX while typing:
 * - spaces / underscores → hyphens ("my factory" → "my-factory")
 * - other invalid chars stripped (spaces never remain in the value)
 * - runs of hyphens collapsed
 * - lowercased
 * - leading hyphens stripped immediately (no leading space/hyphen in the slug)
 *
 * A single trailing hyphen is kept mid-edit so "my " → "my-" then "factory"
 * can continue; {@link finalizeFactoryName} removes edge hyphens on blur.
 */
export function sanitizeFactoryNameInput(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+/, "")
}

/** Trim trailing hyphens after the user leaves the field; never empty. */
export function finalizeFactoryName(raw: string): string {
  const cleaned = sanitizeFactoryNameInput(raw).replace(/-+$/g, "")
  return cleaned || DEFAULT_STACK_SELECTIONS.name
}

/** Parse + validate JSON; unknown or corrupt data falls back to defaults. */
export function parseStackSelections(raw: unknown): StackBuilderSelections {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_STACK_SELECTIONS }
  }

  const o = raw as Record<string, unknown>
  const installMode = o.installMode
  // Migrate legacy `store` key from earlier Stack Builder builds
  const ticketsRaw = o.tickets ?? o.store
  const pm = o.pm

  const name =
    sanitizeFactoryNameInput(asString(o.name, DEFAULT_STACK_SELECTIONS.name)) ||
    DEFAULT_STACK_SELECTIONS.name

  const modelRaw = asString(o.model, DEFAULT_STACK_SELECTIONS.model).trim()

  return {
    name,
    installMode:
      typeof installMode === "string" && INSTALL_MODES.has(installMode as InstallMode)
        ? (installMode as InstallMode)
        : DEFAULT_STACK_SELECTIONS.installMode,
    packagePath:
      asString(o.packagePath, DEFAULT_STACK_SELECTIONS.packagePath) ||
      DEFAULT_STACK_SELECTIONS.packagePath,
    tickets:
      typeof ticketsRaw === "string" && TICKETS.has(ticketsRaw as TicketsId)
        ? (ticketsRaw as TicketsId)
        : DEFAULT_STACK_SELECTIONS.tickets,
    slack: typeof o.slack === "boolean" ? o.slack : DEFAULT_STACK_SELECTIONS.slack,
    pm:
      typeof pm === "string" && PMS.has(pm as PackageManager)
        ? (pm as PackageManager)
        : DEFAULT_STACK_SELECTIONS.pm,
    model: isModelId(modelRaw) ? modelRaw : DEFAULT_STACK_SELECTIONS.model,
  }
}

export function loadStackSelections(): StackBuilderSelections {
  if (typeof window === "undefined") {
    return { ...DEFAULT_STACK_SELECTIONS }
  }
  try {
    const raw = window.localStorage.getItem(STACK_BUILDER_STORAGE_KEY)
    if (!raw) return { ...DEFAULT_STACK_SELECTIONS }
    return parseStackSelections(JSON.parse(raw) as unknown)
  } catch {
    return { ...DEFAULT_STACK_SELECTIONS }
  }
}

export function saveStackSelections(selections: StackBuilderSelections): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(
      STACK_BUILDER_STORAGE_KEY,
      JSON.stringify(selections),
    )
  } catch {
    // Quota / private mode — ignore
  }
}

export function clearStackSelections(): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.removeItem(STACK_BUILDER_STORAGE_KEY)
  } catch {
    // ignore
  }
}
