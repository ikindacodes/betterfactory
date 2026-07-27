"use client"

import { useEffect, useMemo, useState } from "react"
import {
  composeStack,
  selectRecipes,
  type FileMap,
  type StackConfig,
} from "create-betterfactory/modules"
import {
  TreeExpander,
  TreeIcon,
  TreeLabel,
  TreeNode,
  TreeNodeContent,
  TreeNodeTrigger,
  TreeProvider,
  TreeView,
} from "@/components/kibo-ui/tree"
import {
  defaultExpandedIds,
  pathsToTree,
  type PathTreeNode,
} from "@/lib/paths-to-tree"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@workspace/ui/components/resizable"
import { cn } from "@workspace/ui/lib/utils"

const DEFAULT_FILE = "agent/agent.ts"

type StackPreviewTreeProps = {
  stack: StackConfig
  className?: string
}

function FileNodes({
  nodes,
  level,
  parentPath,
  filePaths,
  onFileOpen,
}: {
  nodes: PathTreeNode[]
  level: number
  parentPath: boolean[]
  filePaths: Set<string>
  onFileOpen: (path: string) => void
}) {
  return nodes.map((node, index) => {
    const isLast = index === nodes.length - 1
    const hasChildren = Boolean(node.children?.length)
    const isFile = filePaths.has(node.id)

    return (
      <TreeNode
        key={node.id}
        nodeId={node.id}
        level={level}
        isLast={isLast}
        parentPath={parentPath}
      >
        <TreeNodeTrigger
          className="rounded-none py-1.5"
          onClick={() => {
            if (isFile) onFileOpen(node.id)
          }}
        >
          <TreeExpander hasChildren={hasChildren} />
          <TreeIcon hasChildren={hasChildren} />
          <TreeLabel className="font-mono text-xs">{node.name}</TreeLabel>
        </TreeNodeTrigger>
        {hasChildren ? (
          <TreeNodeContent hasChildren>
            <FileNodes
              nodes={node.children!}
              level={level + 1}
              parentPath={[...parentPath, isLast]}
              filePaths={filePaths}
              onFileOpen={onFileOpen}
            />
          </TreeNodeContent>
        ) : null}
      </TreeNode>
    )
  })
}

function pickDefaultPath(files: FileMap, preferred: string): string {
  if (preferred in files) return preferred
  if (DEFAULT_FILE in files) return DEFAULT_FILE
  const keys = Object.keys(files).sort()
  return keys[0] ?? DEFAULT_FILE
}

function ancestorIds(path: string, rootName: string): string[] {
  const parts = path.split("/").filter(Boolean)
  const ids: string[] = [rootName]
  let acc = ""
  for (let i = 0; i < parts.length - 1; i++) {
    acc = acc ? `${acc}/${parts[i]}` : parts[i]!
    ids.push(acc)
  }
  return ids
}

export function StackPreviewTree({ stack, className }: StackPreviewTreeProps) {
  const recipes = useMemo(() => selectRecipes(stack), [stack])
  const files = useMemo(() => composeStack(stack), [stack])
  const livePaths = useMemo(() => Object.keys(files).sort(), [files])
  const livePathSet = useMemo(() => new Set(livePaths), [livePaths])

  const rootName = useMemo(() => {
    if (stack.installMode === "in-place") {
      return stack.packagePath?.trim() || "apps/my-factory"
    }
    return stack.name.trim() || "my-factory"
  }, [stack.installMode, stack.packagePath, stack.name])

  const [selectedPath, setSelectedPath] = useState(DEFAULT_FILE)

  useEffect(() => {
    if (livePathSet.has(selectedPath)) return
    setSelectedPath(pickDefaultPath(files, DEFAULT_FILE))
  }, [livePathSet, selectedPath, files])

  const tree = useMemo(
    () => pathsToTree(livePaths, rootName),
    [livePaths, rootName],
  )

  const expanded = useMemo(() => {
    const base = defaultExpandedIds(tree, 2)
    const extra = new Set(base)
    for (const id of ancestorIds(selectedPath, rootName)) {
      extra.add(id)
    }
    return [...extra]
  }, [tree, selectedPath, rootName])

  const treeKey = useMemo(
    () =>
      [rootName, stack.tickets, stack.channels.join(","), livePaths.length].join(
        "|",
      ),
    [rootName, stack.tickets, stack.channels, livePaths.length],
  )

  const previewBody = files[selectedPath] ?? "// File not in this stack."
  const lineCount = previewBody.split("\n").length

  return (
    <div className={cn("flex h-full min-h-0 flex-col gap-3", className)}>
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold tracking-widest uppercase">
          Install preview
        </span>
        <span className="text-muted-foreground font-mono text-[10px] tracking-wide uppercase">
          {livePaths.length} files · {recipes.length} modules
        </span>
      </div>

      <div className="flex shrink-0 flex-wrap gap-1.5">
        {recipes.map((recipe) => (
          <span
            key={recipe.id}
            title={recipe.description}
            className={cn(
              "border px-2 py-0.5 font-mono text-[10px] tracking-wide",
              recipe.always
                ? "border-primary/40 bg-primary/5 text-foreground"
                : "border-border text-muted-foreground",
            )}
          >
            {recipe.id}
          </span>
        ))}
      </div>

      <div className="border-border min-h-0 flex-1 border">
        <ResizablePanelGroup
          orientation="horizontal"
          className="h-full min-h-[18rem]"
          id="install-preview"
        >
          <ResizablePanel
            id="tree"
            defaultSize="28%"
            minSize="18%"
            className="min-w-0"
          >
            <div className="h-full min-h-0 overflow-auto">
              <TreeProvider
                key={treeKey}
                defaultExpandedIds={expanded}
                selectable
                selectedIds={[selectedPath]}
                onSelectionChange={(ids) => {
                  const id = ids[0]
                  if (!id) return
                  if (livePathSet.has(id)) setSelectedPath(id)
                }}
                showLines
                showIcons
                indent={16}
                animateExpand
                className="min-w-0"
              >
                <TreeView className="p-1" aria-label="Generated install tree">
                  <TreeNode nodeId={tree.id} level={0} isLast>
                    <TreeNodeTrigger className="rounded-none py-1.5">
                      <TreeExpander hasChildren />
                      <TreeIcon hasChildren />
                      <TreeLabel className="font-mono text-xs font-medium">
                        {tree.name}/
                      </TreeLabel>
                    </TreeNodeTrigger>
                    {tree.children?.length ? (
                      <TreeNodeContent hasChildren>
                        <FileNodes
                          nodes={tree.children}
                          level={1}
                          parentPath={[true]}
                          filePaths={livePathSet}
                          onFileOpen={setSelectedPath}
                        />
                      </TreeNodeContent>
                    ) : null}
                  </TreeNode>
                </TreeView>
              </TreeProvider>
            </div>
          </ResizablePanel>

          <ResizableHandle
            withHandle
            className="bg-border hover:bg-primary/40 data-[separator]:w-1.5 transition-colors"
          />

          <ResizablePanel
            id="file"
            defaultSize="72%"
            minSize="30%"
            className="min-w-0"
          >
            <div className="bg-card flex h-full min-h-0 flex-col">
              <div className="border-border flex shrink-0 flex-wrap items-center justify-between gap-2 border-b px-3 py-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="text-muted-foreground text-[10px] font-semibold tracking-widest uppercase">
                    File
                  </span>
                  <code className="text-foreground truncate font-mono text-xs">
                    {selectedPath}
                  </code>
                </div>
                <span className="text-muted-foreground font-mono text-[10px] tabular-nums">
                  {lineCount} lines
                </span>
              </div>
              <pre className="text-card-foreground min-h-0 flex-1 overflow-auto p-3 font-mono text-[11px] leading-relaxed whitespace-pre sm:text-xs">
                {previewBody}
              </pre>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  )
}
