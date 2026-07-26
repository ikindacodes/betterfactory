import type { StackConfig } from "./types.js";

export type PackageManager = "npm" | "pnpm" | "bun" | "yarn";

export interface CreateCommandOptions {
  /** Defaults to npm create / npx style. */
  packageManager?: PackageManager;
  /** Use `@latest` tag (default true). */
  latest?: boolean;
  /**
   * When true (default), emit non-interactive flags (`-y` and axes).
   * Stack Builder always wants this so the command is copy-pasteable.
   */
  nonInteractive?: boolean;
}

/**
 * Build the same create CLI invocation the Wizard / Stack Builder advertise.
 * Mirrors flags on `create-betterfactory`.
 */
export function buildCreateCommand(
  stack: StackConfig,
  options: CreateCommandOptions = {},
): string {
  const pm = options.packageManager ?? "npm";
  const latest = options.latest !== false;
  const nonInteractive = options.nonInteractive !== false;
  const pkg = latest ? "create-betterfactory@latest" : "create-betterfactory";

  const parts: string[] = [];

  switch (pm) {
    case "pnpm":
      parts.push("pnpm", "create", latest ? "betterfactory@latest" : "betterfactory");
      break;
    case "yarn":
      parts.push("yarn", "create", latest ? "betterfactory" : "betterfactory");
      break;
    case "bun":
      parts.push("bun", "create", pkg);
      break;
    case "npm":
    default:
      parts.push("npx", pkg);
      break;
  }

  // Name / path argument
  if (stack.installMode === "in-place") {
    // CLI still takes a name; path comes from --package-path
    parts.push(shellQuote(stack.name));
  } else {
    parts.push(shellQuote(stack.name));
  }

  if (nonInteractive) {
    parts.push("-y");
  }

  if (stack.installMode === "in-place") {
    parts.push("--install", "in-place");
    const packagePath = stack.packagePath ?? `apps/${stack.name}`;
    parts.push("--package-path", shellQuote(packagePath));
  } else if (stack.installMode === "new") {
    // default is new; only emit when we want explicitness — skip for shorter commands
  }

  if (stack.store && stack.store !== "github") {
    parts.push("--store", stack.store);
  } else if (nonInteractive) {
    // Explicit default helps Stack Builder show full fidelity
    parts.push("--store", "github");
  }

  const extras = stack.channels.filter((c) => c !== "eve");
  if (extras.length > 0) {
    parts.push("--channel", shellQuote(extras.join(",")));
  }

  return parts.join(" ");
}

function shellQuote(value: string): string {
  if (/^[a-zA-Z0-9@/_.-]+$/.test(value)) return value;
  return `'${value.replace(/'/g, `'\\''`)}'`;
}
