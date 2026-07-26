#!/usr/bin/env node
import { Command } from "commander";
import * as p from "@clack/prompts";
import pc from "picocolors";
import path from "node:path";
import { listCatalog, type WorkItemStoreId, type InstallMode } from "@betterfactory/modules";
import { runWizard, type WizardFlags } from "./wizard.js";
import { installFactory } from "./install.js";

const program = new Command();

program
  .name("create-betterfactory")
  .description(
    "Scaffold an open-source eve Software Factory you fully own",
  )
  .argument("[name]", "Factory name / directory")
  .option("-y, --yes", "Use defaults (non-interactive)")
  .option(
    "--store <store>",
    "Work Item Store: github | linear | markdown",
    "github",
  )
  .option(
    "--channel <channels>",
    "Extra channels comma-separated (e.g. slack)",
  )
  .option(
    "--install <mode>",
    "Install mode: new | in-place",
    "new",
  )
  .option(
    "--package-path <path>",
    "Path for in-place install (default apps/<name>)",
  )
  .option("--force", "Overwrite an existing agent/ tree")
  .option("--dry-run", "Compose Stack and print files without writing")
  .option("--list-modules", "List Module catalog and exit")
  .action(async (name: string | undefined, opts) => {
    if (opts.listModules) {
      const catalog = listCatalog();
      for (const m of catalog) {
        const flags = [
          m.always ? "always" : null,
          m.provides.store ? `store:${m.provides.store}` : null,
          m.provides.channel ? `channel:${m.provides.channel}` : null,
        ]
          .filter(Boolean)
          .join(", ");
        console.log(
          `${pc.cyan(m.id.padEnd(18))} ${m.label} ${pc.dim(`(${flags})`)}`,
        );
        console.log(`  ${pc.dim(m.description)}`);
      }
      return;
    }

    const store = opts.store as WorkItemStoreId;
    if (!["github", "linear", "markdown"].includes(store)) {
      console.error(`Invalid --store: ${store}`);
      process.exit(1);
    }

    const install = opts.install as InstallMode;
    if (!["new", "in-place"].includes(install)) {
      console.error(`Invalid --install: ${install}`);
      process.exit(1);
    }

    const flags: WizardFlags = {
      name,
      yes: Boolean(opts.yes),
      store,
      channel: opts.channel,
      install,
      packagePath: opts.packagePath,
      force: Boolean(opts.force),
    };

    try {
      const stack = await runWizard(flags);

      if (opts.dryRun) {
        const { composeStack } = await import("@betterfactory/modules");
        const files = composeStack(stack);
        p.intro(pc.bgYellow(pc.black(" dry-run ")));
        console.log(pc.dim(JSON.stringify(stack, null, 2)));
        console.log("");
        for (const f of Object.keys(files).sort()) {
          console.log(pc.green("  +"), f);
        }
        console.log("");
        console.log(pc.dim(`${Object.keys(files).length} files`));
        return;
      }

      const s = p.spinner();
      s.start("Composing Modules and writing factory…");
      const { targetDir, files } = await installFactory(
        process.cwd(),
        stack,
        { force: flags.force },
      );
      s.stop(`Wrote ${files.length} files`);

      const rel = path.relative(process.cwd(), targetDir) || ".";
      p.note(
        [
          `cd ${rel}`,
          "cp .env.example .env",
          "pnpm install   # or npm install",
          "pnpm dev       # eve TUI",
        ].join("\n"),
        "Next steps",
      );
      p.outro(
        pc.green("Software Factory ready.") +
          pc.dim(" You own it — plan Work Items, gate Ready for Handoff."),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      p.cancel(message);
      process.exit(1);
    }
  });

program.parse();
