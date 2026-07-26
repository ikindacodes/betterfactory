#!/usr/bin/env node
import { Command } from "commander";
import * as p from "@clack/prompts";
import pc from "picocolors";
import path from "node:path";
import {
  listCatalog,
  composeStack,
  type WorkItemStoreId,
  type InstallMode,
} from "./modules/index.js";
import { runWizard, type WizardFlags } from "./wizard.js";
import { installFactory } from "./install.js";
import {
  copyEnvExample,
  detectPackageManager,
  devCommand,
  installCommand,
  isPackageManager,
  runDependencyInstall,
  type PackageManager,
} from "./package-manager.js";

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
    "Scaffold mode: new | in-place",
    "new",
  )
  .option(
    "--package-path <path>",
    "Path for in-place install (default apps/<name>)",
  )
  .option(
    "--pm <pm>",
    "Package manager: npm | pnpm | yarn | bun (default: auto-detect from pnpm/yarn/bun create)",
  )
  .option(
    "--skip-install",
    "Skip dependency install after scaffolding",
  )
  .option(
    "--skip-env",
    "Skip copying .env.example → .env",
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

    const installMode = opts.install as InstallMode;
    if (!["new", "in-place"].includes(installMode)) {
      console.error(`Invalid --install: ${installMode}`);
      process.exit(1);
    }

    if (opts.pm != null && !isPackageManager(String(opts.pm))) {
      console.error(
        `Invalid --pm: ${opts.pm}. Use npm | pnpm | yarn | bun.`,
      );
      process.exit(1);
    }

    const flags: WizardFlags = {
      name,
      yes: Boolean(opts.yes),
      store,
      channel: opts.channel,
      install: installMode,
      packagePath: opts.packagePath,
      force: Boolean(opts.force),
      packageManager: opts.pm as PackageManager | undefined,
      runInstall: !opts.skipInstall,
      askPackageManager: !opts.skipInstall && opts.pm == null && !opts.yes,
    };

    try {
      const stack = await runWizard(flags);

      if (opts.dryRun) {
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

      if (!opts.skipEnv) {
        s.start("Creating .env from .env.example…");
        const wroteEnv = await copyEnvExample(targetDir);
        s.stop(
          wroteEnv
            ? "Created .env (fill in API keys)"
            : "Skipped .env (already exists or no .env.example)",
        );
      }

      const pm = detectPackageManager(stack.packageManager ?? opts.pm);
      let installOk = false;

      if (!opts.skipInstall && flags.runInstall !== false) {
        const { label } = installCommand(pm);
        p.log.info(`Running ${label}…`);
        try {
          await runDependencyInstall(targetDir, pm);
          installOk = true;
          p.log.success(`Dependencies installed with ${pm}`);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          p.log.warn(
            `Dependency install failed: ${message}\n` +
              `Run \`${label}\` manually in the factory directory.`,
          );
        }
      }

      const rel = path.relative(process.cwd(), targetDir) || ".";
      const nextSteps = [
        `cd ${rel}`,
        opts.skipEnv
          ? "cp .env.example .env"
          : "# Edit .env with your API keys",
        installOk ? null : installCommand(pm).label,
        `${devCommand(pm)}   # eve TUI`,
      ].filter((line): line is string => line != null);

      p.note(nextSteps.join("\n"), "Next steps");
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
