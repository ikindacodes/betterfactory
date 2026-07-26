import type { ModuleRecipe } from "./types.js";
import { coreRecipe } from "./recipes/core.js";
import { storeGithubRecipe } from "./recipes/store-github.js";
import { storeLinearRecipe } from "./recipes/store-linear.js";
import { storeMarkdownRecipe } from "./recipes/store-markdown.js";
import { channelSlackRecipe } from "./recipes/channel-slack.js";

/** Full Module catalog — CLI and Stack Builder share this list. */
export const allRecipes: ModuleRecipe[] = [
  coreRecipe,
  storeGithubRecipe,
  storeLinearRecipe,
  storeMarkdownRecipe,
  channelSlackRecipe,
];

export function getRecipe(id: string): ModuleRecipe | undefined {
  return allRecipes.find((r) => r.id === id);
}
