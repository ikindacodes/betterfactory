import { mkdir, writeFile, access } from "node:fs/promises";
import path from "node:path";
import {
  composeStack,
  type FileMap,
  type StackConfig,
} from "@betterfactory/modules";

export function resolveTargetDir(
  cwd: string,
  stack: StackConfig,
): { targetDir: string; relativeDisplay: string } {
  if (stack.installMode === "in-place") {
    const packagePath = stack.packagePath ?? stack.name;
    const targetDir = path.resolve(cwd, packagePath);
    return { targetDir, relativeDisplay: packagePath };
  }

  const targetDir = path.resolve(cwd, stack.name);
  return { targetDir, relativeDisplay: stack.name };
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

export async function writeFactory(
  targetDir: string,
  files: FileMap,
): Promise<string[]> {
  const written: string[] = [];
  for (const [rel, content] of Object.entries(files)) {
    const abs = path.join(targetDir, rel);
    await mkdir(path.dirname(abs), { recursive: true });
    await writeFile(abs, content, "utf8");
    written.push(rel);
  }
  return written;
}

export async function installFactory(
  cwd: string,
  stack: StackConfig,
  options: { force?: boolean } = {},
): Promise<{ targetDir: string; files: string[]; fileMap: FileMap }> {
  const { targetDir, relativeDisplay } = resolveTargetDir(cwd, stack);

  if ((await pathExists(targetDir)) && !options.force) {
    const agentPath = path.join(targetDir, "agent");
    if (await pathExists(agentPath)) {
      throw new Error(
        `Refusing to overwrite existing factory at ${relativeDisplay} (agent/ present). Pass --force to overwrite.`,
      );
    }
  }

  const fileMap = composeStack(stack);
  const files = await writeFactory(targetDir, fileMap);
  return { targetDir, files, fileMap };
}
