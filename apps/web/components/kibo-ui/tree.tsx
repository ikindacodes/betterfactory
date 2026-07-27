"use client"

import { ChevronRight, File, Folder, FolderOpen } from "lucide-react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import {
  type ComponentProps,
  createContext,
  type HTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  useCallback,
  useContext,
  useId,
  useState,
} from "react"
import { cn } from "@workspace/ui/lib/utils"

type TreeContextType = {
  expandedIds: Set<string>
  selectedIds: string[]
  toggleExpanded: (nodeId: string) => void
  handleSelection: (nodeId: string, ctrlKey: boolean) => void
  showLines?: boolean
  showIcons?: boolean
  selectable?: boolean
  multiSelect?: boolean
  indent?: number
  animateExpand?: boolean
}

const TreeContext = createContext<TreeContextType | undefined>(undefined)

const useTree = () => {
  const context = useContext(TreeContext)
  if (!context) {
    throw new Error("Tree components must be used within a TreeProvider")
  }
  return context
}

type TreeNodeContextType = {
  nodeId: string
  level: number
  isLast: boolean
  parentPath: boolean[]
}

const TreeNodeContext = createContext<TreeNodeContextType | undefined>(
  undefined,
)

const useTreeNode = () => {
  const context = useContext(TreeNodeContext)
  if (!context) {
    throw new Error("TreeNode components must be used within a TreeNode")
  }
  return context
}

export type TreeProviderProps = {
  children: ReactNode
  defaultExpandedIds?: string[]
  showLines?: boolean
  showIcons?: boolean
  selectable?: boolean
  multiSelect?: boolean
  selectedIds?: string[]
  onSelectionChange?: (selectedIds: string[]) => void
  indent?: number
  animateExpand?: boolean
  className?: string
}

export const TreeProvider = ({
  children,
  defaultExpandedIds = [],
  showLines = true,
  showIcons = true,
  selectable = true,
  multiSelect = false,
  selectedIds,
  onSelectionChange,
  indent = 20,
  animateExpand = true,
  className,
}: TreeProviderProps) => {
  const prefersReducedMotion = useReducedMotion()
  const shouldAnimate = animateExpand && !prefersReducedMotion

  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    () => new Set(defaultExpandedIds),
  )
  const [internalSelectedIds, setInternalSelectedIds] = useState<string[]>(
    selectedIds ?? [],
  )

  const isControlled =
    selectedIds !== undefined && onSelectionChange !== undefined
  const currentSelectedIds = isControlled ? selectedIds : internalSelectedIds

  const toggleExpanded = useCallback((nodeId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(nodeId)) {
        next.delete(nodeId)
      } else {
        next.add(nodeId)
      }
      return next
    })
  }, [])

  const handleSelection = useCallback(
    (nodeId: string, ctrlKey = false) => {
      if (!selectable) {
        return
      }

      let newSelection: string[]

      if (multiSelect && ctrlKey) {
        newSelection = currentSelectedIds.includes(nodeId)
          ? currentSelectedIds.filter((id) => id !== nodeId)
          : [...currentSelectedIds, nodeId]
      } else {
        // Always select on click (don't toggle off) — better for file browsers.
        newSelection = [nodeId]
      }

      if (isControlled) {
        onSelectionChange?.(newSelection)
      } else {
        setInternalSelectedIds(newSelection)
      }
    },
    [
      selectable,
      multiSelect,
      currentSelectedIds,
      isControlled,
      onSelectionChange,
    ],
  )

  return (
    <TreeContext.Provider
      value={{
        expandedIds,
        selectedIds: currentSelectedIds,
        toggleExpanded,
        handleSelection,
        showLines,
        showIcons,
        selectable,
        multiSelect,
        indent,
        animateExpand: shouldAnimate,
      }}
    >
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className={cn("w-full", className)}
        initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
        transition={{
          duration: prefersReducedMotion ? 0 : 0.3,
          ease: "easeOut",
        }}
      >
        {children}
      </motion.div>
    </TreeContext.Provider>
  )
}

export type TreeViewProps = HTMLAttributes<HTMLDivElement>

export const TreeView = ({ className, children, ...props }: TreeViewProps) => (
  <div role="tree" className={cn("p-2", className)} {...props}>
    {children}
  </div>
)

export type TreeNodeProps = HTMLAttributes<HTMLDivElement> & {
  nodeId?: string
  level?: number
  isLast?: boolean
  parentPath?: boolean[]
  children?: ReactNode
}

export const TreeNode = ({
  nodeId: providedNodeId,
  level = 0,
  isLast = false,
  parentPath = [],
  children,
  className,
  ...props
}: TreeNodeProps) => {
  const generatedId = useId()
  const nodeId = providedNodeId ?? generatedId

  const currentPath = level === 0 ? [] : [...parentPath]
  if (level > 0 && parentPath.length < level - 1) {
    while (currentPath.length < level - 1) {
      currentPath.push(false)
    }
  }
  if (level > 0) {
    currentPath[level - 1] = isLast
  }

  return (
    <TreeNodeContext.Provider
      value={{
        nodeId,
        level,
        isLast,
        parentPath: currentPath,
      }}
    >
      <div className={cn("select-none", className)} {...props}>
        {children}
      </div>
    </TreeNodeContext.Provider>
  )
}

export type TreeNodeTriggerProps = ComponentProps<typeof motion.div>

export const TreeNodeTrigger = ({
  children,
  className,
  onClick,
  ...props
}: TreeNodeTriggerProps) => {
  const {
    selectedIds,
    toggleExpanded,
    handleSelection,
    indent,
    animateExpand,
  } = useTree()
  const { nodeId, level } = useTreeNode()
  const isSelected = selectedIds.includes(nodeId)

  function activate(
    e: ReactMouseEvent | ReactKeyboardEvent,
    ctrlKey = false,
  ) {
    toggleExpanded(nodeId)
    handleSelection(nodeId, ctrlKey)
    // motion.div's onClick expects a mouse event; only forward those.
    if ("button" in e) {
      onClick?.(e as ReactMouseEvent<HTMLDivElement>)
    }
  }

  return (
    <motion.div
      role="treeitem"
      tabIndex={0}
      aria-selected={isSelected}
      className={cn(
        "group relative mx-1 flex cursor-pointer items-center rounded-md px-3 py-2 transition-[background-color,color,transform] duration-200",
        "hover:bg-accent/50",
        "focus-visible:ring-ring/30 focus-visible:ring-2 focus-visible:outline-none",
        isSelected && "bg-accent/80",
        className,
      )}
      onClick={(e) => {
        activate(e, e.ctrlKey || e.metaKey)
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          activate(e, e.ctrlKey || e.metaKey)
        }
      }}
      style={{ paddingLeft: level * (indent ?? 0) + 8 }}
      whileTap={
        animateExpand
          ? { scale: 0.98, transition: { duration: 0.1 } }
          : undefined
      }
      {...props}
    >
      <TreeLines />
      {children as ReactNode}
    </motion.div>
  )
}

export const TreeLines = () => {
  const { showLines, indent } = useTree()
  const { level, isLast, parentPath } = useTreeNode()

  if (!showLines || level === 0) {
    return null
  }

  return (
    <div className="pointer-events-none absolute top-0 bottom-0 left-0">
      {Array.from({ length: level }, (_, index) => {
        const shouldHideLine = parentPath[index] === true
        if (shouldHideLine && index === level - 1) {
          return null
        }

        return (
          <div
            className="border-border/40 absolute top-0 bottom-0 border-l"
            key={index.toString()}
            style={{
              left: index * (indent ?? 0) + 12,
              display: shouldHideLine ? "none" : "block",
            }}
          />
        )
      })}

      <div
        className="border-border/40 absolute top-1/2 border-t"
        style={{
          left: (level - 1) * (indent ?? 0) + 12,
          width: (indent ?? 0) - 4,
          transform: "translateY(-1px)",
        }}
      />

      {isLast && (
        <div
          className="border-border/40 absolute top-0 border-l"
          style={{
            left: (level - 1) * (indent ?? 0) + 12,
            height: "50%",
          }}
        />
      )}
    </div>
  )
}

export type TreeNodeContentProps = ComponentProps<typeof motion.div> & {
  hasChildren?: boolean
}

export const TreeNodeContent = ({
  children,
  hasChildren = false,
  className,
  ...props
}: TreeNodeContentProps) => {
  const { animateExpand, expandedIds } = useTree()
  const { nodeId } = useTreeNode()
  const isExpanded = expandedIds.has(nodeId)

  return (
    <AnimatePresence>
      {hasChildren && isExpanded && (
        <motion.div
          animate={{ height: "auto", opacity: 1 }}
          className="overflow-hidden"
          exit={{ height: 0, opacity: 0 }}
          initial={{ height: 0, opacity: 0 }}
          transition={{
            duration: animateExpand ? 0.3 : 0,
            ease: "easeInOut",
          }}
        >
          <motion.div
            animate={{ y: 0 }}
            className={className}
            exit={{ y: -10 }}
            initial={{ y: -10 }}
            transition={{
              duration: animateExpand ? 0.2 : 0,
              delay: animateExpand ? 0.1 : 0,
            }}
            {...props}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export type TreeExpanderProps = ComponentProps<typeof motion.div> & {
  hasChildren?: boolean
}

export const TreeExpander = ({
  hasChildren = false,
  className,
  onClick,
  ...props
}: TreeExpanderProps) => {
  const { expandedIds, toggleExpanded } = useTree()
  const { nodeId } = useTreeNode()
  const isExpanded = expandedIds.has(nodeId)

  if (!hasChildren) {
    return <div className="mr-1 h-4 w-4" />
  }

  return (
    <motion.div
      animate={{ rotate: isExpanded ? 90 : 0 }}
      className={cn(
        "mr-1 flex h-4 w-4 cursor-pointer items-center justify-center",
        className,
      )}
      aria-hidden
      onClick={(e) => {
        e.stopPropagation()
        toggleExpanded(nodeId)
        onClick?.(e)
      }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      {...props}
    >
      <ChevronRight className="text-muted-foreground h-3 w-3" aria-hidden />
    </motion.div>
  )
}

export type TreeIconProps = ComponentProps<typeof motion.div> & {
  icon?: ReactNode
  hasChildren?: boolean
}

export const TreeIcon = ({
  icon,
  hasChildren = false,
  className,
  ...props
}: TreeIconProps) => {
  const { showIcons, expandedIds } = useTree()
  const { nodeId } = useTreeNode()
  const isExpanded = expandedIds.has(nodeId)

  if (!showIcons) {
    return null
  }

  const getDefaultIcon = () =>
    hasChildren ? (
      isExpanded ? (
        <FolderOpen className="h-4 w-4" />
      ) : (
        <Folder className="h-4 w-4" />
      )
    ) : (
      <File className="h-4 w-4" />
    )

  return (
    <motion.div
      className={cn(
        "text-muted-foreground mr-2 flex h-4 w-4 items-center justify-center",
        className,
      )}
      aria-hidden
      transition={{ duration: 0.15 }}
      whileHover={{ scale: 1.1 }}
      {...props}
    >
      {icon || getDefaultIcon()}
    </motion.div>
  )
}

export type TreeLabelProps = HTMLAttributes<HTMLSpanElement>

export const TreeLabel = ({ className, ...props }: TreeLabelProps) => (
  <span className={cn("font flex-1 truncate text-sm", className)} {...props} />
)
