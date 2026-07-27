export { installFactory, writeFactory, resolveTargetDir } from "./install.js";
export { runWizard, type WizardFlags } from "./wizard.js";
export {
  copyEnvExample,
  detectPackageManager,
  runDependencyInstall,
  installCommand,
  devCommand,
  isPackageManager,
} from "./package-manager.js";

export type {
  ChannelId,
  ComposeContext,
  FileContents,
  FileMap,
  InstallMode,
  ModuleRecipe,
  StackConfig,
  TicketsId,
  WorkItemStoreId,
  PackageManagerId,
} from "./modules/types.js";

export {
  WORK_ITEM_FIELDS,
  WORK_ITEM_MARKDOWN_TEMPLATE,
  DEFINITION_OF_READY_CHECKLIST,
  type WorkItemField,
} from "./modules/work-item.js";

export { allRecipes, getRecipe } from "./modules/catalog.js";
export { composeStack, selectRecipes, listCatalog } from "./modules/compose.js";
export {
  buildCreateCommand,
  type CreateCommandOptions,
  type PackageManager,
} from "./modules/command.js";
