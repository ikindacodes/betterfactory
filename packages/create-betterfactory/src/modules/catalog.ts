import type { ModuleRecipe } from "./types.js";
import { coreRecipe } from "./recipes/core.js";
import { ticketsGithubRecipe } from "./recipes/tickets-github.js";
import { ticketsLinearRecipe } from "./recipes/tickets-linear.js";
import { ticketsMarkdownRecipe } from "./recipes/tickets-markdown.js";
import { channelSlackRecipe } from "./recipes/channel-slack.js";

/** Full Module catalog — CLI and Stack Builder share this list. */
export const allRecipes: ModuleRecipe[] = [
  coreRecipe,
  ticketsGithubRecipe,
  ticketsLinearRecipe,
  ticketsMarkdownRecipe,
  channelSlackRecipe,
];

export function getRecipe(id: string): ModuleRecipe | undefined {
  return allRecipes.find((r) => r.id === id);
}
