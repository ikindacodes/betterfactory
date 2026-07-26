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
 * Run the package manager install in `targetDir`.
 * Streams output to the parent terminal.
 */
export function runDependencyInstall(
  targetDir: string,
  pm: PackageManager,
): Promise<void> {
  const { command, args } = installCommand(pm);

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: targetDir,
      stdio: "inherit",
      shell: process.platform === "win32",
      env: process.env,
    });

    child.on("error", (err) => {
      reject(
        new Error(
          `Failed to start ${command}: ${err.message}. Install ${pm} or re-run with --pm npm.`,
        ),
      );
    });

    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} exited with code ${code}`));
    });
  });
}
