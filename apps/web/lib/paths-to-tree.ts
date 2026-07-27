/** Hierarchical node for rendering a file path list as a tree. */
export type PathTreeNode = {
  id: string
  name: string
  children?: PathTreeNode[]
}

/**
 * Turn flat relative paths into a sorted folder/file tree under `rootName`.
 * Example: `["agent/agent.ts", "package.json"]` → root with agent/ + package.json.
 */
export function pathsToTree(
  paths: string[],
  rootName: string,
): PathTreeNode {
  type Mutable = {
    id: string
    name: string
    children?: Map<string, Mutable>
  }

  const root: Mutable = {
    id: rootName,
    name: rootName,
    children: new Map(),
  }

  for (const raw of paths) {
    const parts = raw.split("/").filter(Boolean)
    let current = root

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]!
      const isFile = i === parts.length - 1
      const id = current.id === rootName ? part : `${current.id}/${part}`

      if (!current.children) {
        current.children = new Map()
      }

      let next = current.children.get(part)
      if (!next) {
        next = {
          id,
          name: part,
          children: isFile ? undefined : new Map(),
        }
        current.children.set(part, next)
      } else if (!isFile && !next.children) {
        next.children = new Map()
      }

      current = next
    }
  }

  function freeze(node: Mutable): PathTreeNode {
    if (!node.children) {
      return { id: node.id, name: node.name }
    }

    const kids = [...node.children.values()]
      .map(freeze)
      .sort((a, b) => {
        const aDir = Boolean(a.children)
        const bDir = Boolean(b.children)
        if (aDir !== bDir) return aDir ? -1 : 1
        return a.name.localeCompare(b.name)
      })

    return {
      id: node.id,
      name: node.name,
      children: kids,
    }
  }

  return freeze(root)
}

/** Default expand: root + first two directory levels (keeps preview scannable). */
export function defaultExpandedIds(root: PathTreeNode, maxDepth = 2): string[] {
  const ids: string[] = []

  function walk(node: PathTreeNode, depth: number) {
    if (!node.children?.length) return
    if (depth > maxDepth) return
    ids.push(node.id)
    for (const child of node.children) {
      walk(child, depth + 1)
    }
  }

  walk(root, 0)
  return ids
}
