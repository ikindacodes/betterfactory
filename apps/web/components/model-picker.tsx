"use client"

import { useEffect, useMemo, useState } from "react"
import { DEFAULT_MODEL } from "create-betterfactory/modules"
import {
  Combobox,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
} from "@workspace/ui/components/combobox"
import { FieldDescription } from "@workspace/ui/components/field"
import type { GatewayModel } from "@/lib/gateway-models"

type ModelGroup = {
  value: string
  items: GatewayModel[]
}

type ModelPickerProps = {
  value: string
  onValueChange: (modelId: string) => void
  id?: string
  disabled?: boolean
}

export function ModelPicker({
  value,
  onValueChange,
  id = "default-model",
  disabled,
}: ModelPickerProps) {
  const [models, setModels] = useState<GatewayModel[]>([])
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setStatus("loading")
      setErrorMessage(null)
      try {
        const res = await fetch("/api/gateway-models")
        const json = (await res.json()) as {
          models?: GatewayModel[]
          error?: string
        }
        if (!res.ok) {
          throw new Error(json.error ?? `HTTP ${res.status}`)
        }
        if (cancelled) return
        const list = Array.isArray(json.models) ? json.models : []
        setModels(list)
        setStatus("ready")
      } catch (err) {
        if (cancelled) return
        setStatus("error")
        setErrorMessage(err instanceof Error ? err.message : String(err))
        setModels([])
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const groups: ModelGroup[] = useMemo(() => {
    const byProvider = new Map<string, GatewayModel[]>()
    for (const m of models) {
      const list = byProvider.get(m.provider) ?? []
      list.push(m)
      byProvider.set(m.provider, list)
    }
    return Array.from(byProvider.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([provider, items]) => ({
        value: provider,
        items: items.sort((a, b) => a.id.localeCompare(b.id)),
      }))
  }, [models])

  const selected = useMemo(
    () => models.find((m) => m.id === value) ?? null,
    [models, value],
  )

  const fallbackItems = useMemo(() => {
    // Keep the current selection selectable while loading / offline
    if (models.some((m) => m.id === value)) return groups
    if (!value) return groups
    const provider = value.split("/")[0] ?? "custom"
    const synthetic: GatewayModel = {
      id: value,
      name: value.split("/")[1] ?? value,
      provider,
    }
    return [
      {
        value: provider,
        items: [synthetic],
      },
      ...groups.filter((g) => g.value !== provider),
    ]
  }, [groups, models, value])

  const controlledValue: GatewayModel | null = useMemo(() => {
    if (selected) return selected
    if (!value) return null
    return {
      id: value,
      name: value.split("/")[1] ?? value,
      provider: value.split("/")[0] ?? "",
    }
  }, [selected, value])

  return (
    <div className="flex flex-col gap-1.5">
      <Combobox
        items={fallbackItems}
        value={controlledValue}
        onValueChange={(next) => {
          if (next == null) {
            onValueChange(DEFAULT_MODEL)
            return
          }
          if (typeof next === "object" && next !== null && "id" in next) {
            onValueChange(String((next as GatewayModel).id))
          }
        }}
        itemToStringLabel={(item: GatewayModel) => item.id}
        itemToStringValue={(item: GatewayModel) => item.id}
        isItemEqualToValue={(a: GatewayModel, b: GatewayModel) => a.id === b.id}
        disabled={disabled || status === "loading"}
      >
        <ComboboxInput
          id={id}
          placeholder={
            status === "loading"
              ? "Loading AI Gateway models…"
              : "Search provider/model…"
          }
          className="w-full **:data-[slot=input-group-control]:font-mono **:data-[slot=input-group-control]:text-sm"
          showClear={Boolean(value) && value !== DEFAULT_MODEL}
          disabled={disabled || status === "loading"}
        />
        <ComboboxContent className="min-w-[var(--anchor-width)]">
          <ComboboxEmpty>
            {status === "error"
              ? "Could not load models."
              : "No models match your search."}
          </ComboboxEmpty>
          <ComboboxList>
            {(group: ModelGroup) => (
              <ComboboxGroup key={group.value} items={group.items}>
                <ComboboxLabel>{group.value}</ComboboxLabel>
                <ComboboxCollection>
                  {(model: GatewayModel) => (
                    <ComboboxItem key={model.id} value={model}>
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="truncate font-mono text-xs">
                          {model.id}
                        </span>
                        {model.name && model.name !== model.id.split("/")[1] ? (
                          <span className="text-muted-foreground truncate text-[11px]">
                            {model.name}
                          </span>
                        ) : null}
                      </span>
                    </ComboboxItem>
                  )}
                </ComboboxCollection>
              </ComboboxGroup>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      {status === "error" ? (
        <FieldDescription className="text-destructive">
          {errorMessage ?? "Failed to load models from AI Gateway."} Using{" "}
          <span className="font-mono">{value || DEFAULT_MODEL}</span>.
        </FieldDescription>
      ) : null}
    </div>
  )
}
