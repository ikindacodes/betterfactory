/** Stack axes the Wizard collects (v0). */
export type TicketsId = "github" | "linear" | "markdown";

/** @deprecated Use TicketsId */
export type WorkItemStoreId = TicketsId;

export type ChannelId = "eve" | "slack";

export type InstallMode = "new" | "in-place";

export type PackageManagerId = "npm" | "pnpm" | "bun" | "yarn";

/**
 * Default default model for Root / Planner / Reviewer.
 * AI Gateway `provider/model` slug — must be available via AI_GATEWAY_API_KEY.
 * @see https://vercel.com/docs/ai-gateway
 */
export const DEFAULT_MODEL = "xai/grok-4.5";

/** Validate AI Gateway-style `provider/model` slugs. */
export function isModelId(value: string): boolean {
  return /^[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._-]*$/i.test(value.trim());
}

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
  /**
   * AI Gateway model for Root, Planner, and Reviewer (`provider/model`).
   * Defaults to {@link DEFAULT_MODEL} when omitted.
   */
  model?: string;
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
