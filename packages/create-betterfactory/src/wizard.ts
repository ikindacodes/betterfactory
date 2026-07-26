import * as p from "@clack/prompts";
import pc from "picocolors";
import type {
  ChannelId,
  InstallMode,
  StackConfig,
  WorkItemStoreId,
} from "./modules/types.js";
import {
  detectPackageManager,
  type PackageManager,
} from "./package-manager.js";

export interface WizardFlags {
  name?: string;
  yes?: boolean;
  store?: WorkItemStoreId;
  channel?: string;
  install?: InstallMode;
  packagePath?: string;
  force?: boolean;
  packageManager?: PackageManager;
  /** When false, skip dependency install (still may set packageManager). */
  runInstall?: boolean;
  /** Prompt for package manager in interactive mode. */
  askPackageManager?: boolean;
}

function assertNotCancel<T>(value: T | symbol): T {
  if (p.isCancel(value)) {
    p.cancel("Scaffold cancelled.");
    process.exit(0);
  }
  return value;
}

export async function runWizard(flags: WizardFlags): Promise<StackConfig> {
  const detected = detectPackageManager(flags.packageManager);

  if (flags.yes) {
    const name = flags.name ?? "my-factory";
    const channels: ChannelId[] = ["eve"];
    if (flags.channel) {
      for (const c of flags.channel.split(",")) {
        const id = c.trim() as ChannelId;
        if (id === "slack") channels.push("slack");
      }
    }
    return {
      name,
      installMode: flags.install ?? "new",
      store: flags.store ?? "github",
      channels,
      packagePath: flags.packagePath,
      packageManager: detected,
    };
  }

  p.intro(pc.bgGreen(pc.black(" create-betterfactory ")));
  p.note(
    [
      "Scaffold a Software Factory you own.",
      "It plans Work Items and gates Ready for Handoff —",
      "it does not replace Cursor / Grok Build as a coding harness.",
    ].join("\n"),
    "betterfactory",
  );

  const name = assertNotCancel(
    await p.text({
      message: "Factory name (package / directory)",
      placeholder: "my-factory",
      initialValue: flags.name ?? "my-factory",
      validate: (v) => {
        if (!v || !/^[a-zA-Z0-9@/_-]+$/.test(v)) {
          return "Use a simple package or path-friendly name";
        }
      },
    }),
  );

  const installMode = assertNotCancel(
    await p.select({
      message: "Install mode",
      initialValue: flags.install ?? "new",
      options: [
        {
          value: "new" as const,
          label: "New directory",
          hint: `./${name}`,
        },
        {
          value: "in-place" as const,
          label: "Into this repository",
          hint: "e.g. apps/factory or packages/factory",
        },
      ],
    }),
  );

  let packagePath: string | undefined = flags.packagePath;
  if (installMode === "in-place") {
    packagePath = assertNotCancel(
      await p.text({
        message: "Path inside Target Repository",
        placeholder: "apps/factory",
        initialValue: packagePath ?? `apps/${name}`,
        validate: (v) => {
          if (!v) return "Path is required for in-place install";
        },
      }),
    );
  }

  const store = assertNotCancel(
    await p.select({
      message: "Work Item Store",
      initialValue: flags.store ?? "github",
      options: [
        {
          value: "github" as const,
          label: "GitHub Issues",
          hint: "default — great for Coding Agent handoff",
        },
        {
          value: "linear" as const,
          label: "Linear",
          hint: "MCP connection; writes need approval",
        },
        {
          value: "markdown" as const,
          label: "Markdown folder",
          hint: "issues/*.md in the factory package",
        },
      ],
    }),
  );

  const slack = assertNotCancel(
    await p.confirm({
      message: "Add Slack as an optional Channel? (TUI/HTTP always included)",
      initialValue: flags.channel?.includes("slack") ?? false,
    }),
  );

  const channels: ChannelId[] = ["eve"];
  if (slack) channels.push("slack");

  let packageManager: PackageManager = detected;
  if (flags.runInstall !== false && flags.askPackageManager !== false) {
    packageManager = assertNotCancel(
      await p.select({
        message: "Package manager",
        initialValue: detected,
        options: [
          { value: "npm" as const, label: "npm", hint: detected === "npm" ? "detected" : undefined },
          { value: "pnpm" as const, label: "pnpm", hint: detected === "pnpm" ? "detected" : undefined },
          { value: "yarn" as const, label: "yarn", hint: detected === "yarn" ? "detected" : undefined },
          { value: "bun" as const, label: "bun", hint: detected === "bun" ? "detected" : undefined },
        ],
      }),
    );
  }

  return {
    name,
    installMode,
    store,
    channels,
    packagePath,
    packageManager,
  };
}
