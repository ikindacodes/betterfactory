import * as p from "@clack/prompts";
import pc from "picocolors";
import type {
  ChannelId,
  InstallMode,
  StackConfig,
  TicketsId,
} from "./modules/types.js";
import { DEFAULT_MODEL, isModelId } from "./modules/types.js";
import {
  detectPackageManager,
  type PackageManager,
} from "./package-manager.js";

export interface WizardFlags {
  name?: string;
  yes?: boolean;
  tickets?: TicketsId;
  channel?: string;
  install?: InstallMode;
  packagePath?: string;
  force?: boolean;
  packageManager?: PackageManager;
  /** When false, skip dependency install (still may set packageManager). */
  runInstall?: boolean;
  /** Prompt for package manager in interactive mode. */
  askPackageManager?: boolean;
  /** AI Gateway model slug (`provider/model`). */
  model?: string;
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
      tickets: flags.tickets ?? "github",
      channels,
      packagePath: flags.packagePath,
      packageManager: detected,
      model: flags.model?.trim() || DEFAULT_MODEL,
    };
  }

  p.intro(pc.bgGreen(pc.black(" create-betterfactory ")));
  p.note(
    [
      "Scaffold a Software Factory you own.",
      "It plans tickets and gates Ready for Handoff —",
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
        if (!v || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(v)) {
          return "Use lowercase letters, numbers, and hyphens (e.g. my-factory)";
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

  const tickets = assertNotCancel(
    await p.select({
      message: "Tickets",
      initialValue: flags.tickets ?? "github",
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
          hint: "tickets/*.md in the factory package",
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

  const model = assertNotCancel(
    await p.text({
      message: "Default model (AI Gateway provider/model)",
      placeholder: DEFAULT_MODEL,
      initialValue: flags.model?.trim() || DEFAULT_MODEL,
      validate: (v) => {
        if (!v || !isModelId(v)) {
          return "Use a provider/model slug (e.g. xai/grok-4.5)";
        }
      },
    }),
  );

  return {
    name,
    installMode,
    tickets,
    channels,
    packagePath,
    packageManager,
    model: model.trim(),
  };
}
