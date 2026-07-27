import type {
  ComposeContext,
  FileContents,
  FileMap,
  ModuleRecipe,
  StackConfig,
} from "./types.js";
import { allRecipes } from "./catalog.js";

function resolveFile(contents: FileContents, ctx: ComposeContext): string {
  return typeof contents === "function" ? contents(ctx) : contents;
}

/** Select Module recipes for a Stack. */
export function selectRecipes(stack: StackConfig): ModuleRecipe[] {
  const channels = new Set(stack.channels);
  channels.add("eve");

  return allRecipes.filter((recipe) => {
    if (recipe.always) return true;
    if (recipe.provides?.tickets === stack.tickets) return true;
    if (recipe.provides?.channel && channels.has(recipe.provides.channel)) {
      // eve channel is always provided by core files, not channel-slack
      return recipe.provides.channel !== "eve";
    }
    return false;
  });
}

/** Compose selected recipes into a path → content map. Later recipes overwrite. */
export function composeStack(stack: StackConfig): FileMap {
  const packageName =
    stack.name.startsWith("@") || stack.name.includes("/")
      ? stack.name
      : stack.name;

  const ctx: ComposeContext = { stack, packageName };
  const recipes = selectRecipes(stack);
  const files: FileMap = {};

  for (const recipe of recipes) {
    for (const [relPath, contents] of Object.entries(recipe.files)) {
      files[relPath] = resolveFile(contents, ctx);
    }
  }

  return files;
}

/** Catalog metadata for Stack Builder / CLI listing (no file bodies). */
export function listCatalog() {
  return allRecipes.map((r) => ({
    id: r.id,
    label: r.label,
    description: r.description,
    always: Boolean(r.always),
    provides: r.provides ?? {},
  }));
}
