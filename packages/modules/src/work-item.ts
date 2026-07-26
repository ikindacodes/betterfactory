/**
 * Canonical Work Item fields (store-agnostic).
 * Stores map these into issue bodies, tracker fields, or markdown frontmatter.
 */
export const WORK_ITEM_FIELDS = [
  "title",
  "context",
  "outcome",
  "acceptanceCriteria",
  "constraints",
  "pointers",
  "handoffNotes",
  "readyForHandoff",
] as const;

export type WorkItemField = (typeof WORK_ITEM_FIELDS)[number];

export const WORK_ITEM_MARKDOWN_TEMPLATE = `## Context

{{context}}

## Outcome

{{outcome}}

## Acceptance criteria

{{acceptanceCriteria}}

## Constraints

{{constraints}}

## Pointers

{{pointers}}

## Handoff notes

{{handoffNotes}}
`;

export const DEFINITION_OF_READY_CHECKLIST = [
  "Title states a clear outcome in one line",
  "Context explains why this work exists",
  "Outcome is observable / verifiable",
  "Acceptance criteria are checkable bullets",
  "Constraints and non-goals are explicit",
  "Pointers include paths, links, or repro needed to start",
  "Handoff notes tell a stranger or Coding Agent how to begin",
  "Scope fits one Handoff unit (not a multi-week epic without breakdown)",
] as const;
