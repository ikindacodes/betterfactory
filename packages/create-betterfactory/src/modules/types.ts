/** Stack axes the Wizard collects (v0). */
export type TicketsId = "github" | "linear" | "markdown";

/** @deprecated Use TicketsId */
export type WorkItemStoreId = TicketsId;

export type ChannelId = "eve" | "slack";

export type InstallMode = "new" | "in-place";

export type PackageManagerId = "npm" | "pnpm" | "bun" | "yarn";

export interface StackConfig {
  /** Package / directory name for the factory. */
  name: string;
  installMode: InstallMode;
  /** Where tickets are filed: GitHub, Linear, or markdown. */
  tickets: TicketsId;
  /** Always includes "eve". Optional extras. */
  channels: ChannelId[];
  /** Relative path inside Target when using monorepo-friendly layout. */
  packagePath?: string;
  /** Preferred package manager for post-scaffold install. */
  packageManager?: PackageManagerId;
}

export interface ComposeContext {
  stack: StackConfig;
  /** npm package name written into package.json */
  packageName: string;
}

export type FileContents = string | ((ctx: ComposeContext) => string);

export interface ModuleRecipe {
  id: string;
  /** Short label for CLI / Stack Builder. */
  label: string;
  description: string;
  /** When true, always composed into every factory. */
  always?: boolean;
  /** Stack axis this recipe satisfies. */
  provides?: {
    tickets?: TicketsId;
    channel?: ChannelId;
    core?: true;
  };
  /**
   * Paths relative to the factory package root → file body.
   * Functions receive compose context for templating.
   */
  files: Record<string, FileContents>;
}

export type FileMap = Record<string, string>;
