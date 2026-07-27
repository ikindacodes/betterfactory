import { spawn } from "node:child_process";
import { access, copyFile } from "node:fs/promises";
import path from "node:path";
import type { PackageManager } from "./modules/command.js";

export type { PackageManager };

const PACKAGE_MANAGERS: PackageManager[] = ["npm", "pnpm", "yarn", "bun"];

export function isPackageManager(value: string): value is PackageManager {
  return (PACKAGE_MANAGERS as string[]).includes(value);
}

/**
 * Detect which package manager invoked this process.
 * `pnpm create` / `yarn create` / `bunx` set npm_config_user_agent.
 */
export function detectPackageManager(
  preferred?: PackageManager | string,
): PackageManager {
  if (preferred && isPackageManager(preferred)) return preferred;

  const ua = process.env.npm_config_user_agent ?? "";
  if (ua.startsWith("pnpm/")) return "pnpm";
  if (ua.startsWith("yarn/")) return "yarn";
  if (ua.startsWith("bun/")) return "bun";
  if (ua.startsWith("npm/")) return "npm";

  return "npm";
}

export function installCommand(pm: PackageManager): {
  command: string;
  args: string[];
  label: string;
} {
  switch (pm) {
    case "pnpm":
      return { command: "pnpm", args: ["install"], label: "pnpm install" };
    case "yarn":
      return { command: "yarn", args: ["install"], label: "yarn install" };
    case "bun":
      return { command: "bun", args: ["install"], label: "bun install" };
    case "npm":
    default:
      return { command: "npm", args: ["install"], label: "npm install" };
  }
}

export function devCommand(pm: PackageManager): string {
  switch (pm) {
    case "pnpm":
      return "pnpm dev";
    case "yarn":
      return "yarn dev";
    case "bun":
      return "bun run dev";
    case "npm":
    default:
      return "npm run dev";
  }
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

/**
 * Copy `.env.example` → `.env` if `.env` is not already present.
 * Returns true when a file was written.
 */
export async function copyEnvExample(targetDir: string): Promise<boolean> {
  const example = path.join(targetDir, ".env.example");
  const env = path.join(targetDir, ".env");

  if (!(await pathExists(example))) return false;
  if (await pathExists(env)) return false;

  await copyFile(example, env);
  return true;
}

/**
 * Run a command in `cwd`, streaming stdio to the parent terminal.
 */
export function runInDirectory(
  cwd: string,
  command: string,
  args: string[],
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: "inherit",
      shell: process.platform === "win32",
      env: process.env,
    });

    child.on("error", (err) => {
      reject(
        new Error(
          `Failed to start ${command}: ${err.message}`,
        ),
      );
    });

    child.on("close", (code) => {
      if (code === 0) resolve();
      else
        reject(
          new Error(`${command} ${args.join(" ")} exited with code ${code}`),
        );
    });
  });
}

/**
 * Run the package manager install in `targetDir`.
 * Streams output to the parent terminal.
 */
export function runDependencyInstall(
  targetDir: string,
  pm: PackageManager,
): Promise<void> {
  const { command, args } = installCommand(pm);
  return runInDirectory(targetDir, command, args).catch((err) => {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(
      message.includes("Failed to start")
        ? `Failed to start ${command}: ${message}. Install ${pm} or re-run with --pm npm.`
        : message,
    );
  });
}

/**
 * Scaffold Slack channel via eve (non-interactive). Requires deps installed
 * so local `eve` is available through the package's node_modules / npx.
 */
export function runEveAddSlackChannel(targetDir: string): Promise<void> {
  return runInDirectory(targetDir, "npx", [
    "--no-install",
    "eve",
    "channels",
    "add",
    "slack",
    "-y",
  ]).catch(() =>
    // Fallback: allow npx to resolve eve if pathing differs
    runInDirectory(targetDir, "npx", ["eve", "channels", "add", "slack", "-y"]),
  );
}

/**
 * Open an interactive shell in `cwd` (cannot change the parent shell's
 * working directory — a nested shell is the portable workaround).
 * Resolves when the user exits the shell.
 */
export function openShellInDirectory(cwd: string): Promise<number> {
  const shell =
    process.env.SHELL ||
    (process.platform === "win32" ? process.env.COMSPEC || "cmd.exe" : "/bin/sh");

  return new Promise((resolve, reject) => {
    const child = spawn(shell, [], {
      cwd,
      stdio: "inherit",
      env: {
        ...process.env,
        // Hint for shell prompts / tooling that we landed here via scaffold
        BETTERFACTORY_ROOT: cwd,
      },
    });

    child.on("error", reject);
    child.on("close", (code) => resolve(code ?? 0));
  });
}
