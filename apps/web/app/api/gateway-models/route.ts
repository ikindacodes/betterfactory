import { NextResponse } from "next/server"
import type { GatewayModel } from "@/lib/gateway-models"

const GATEWAY_MODELS_URL = "https://ai-gateway.vercel.sh/v1/models"

/** Cache the public catalog for 1 hour — model list changes slowly. */
export const revalidate = 3600

type GatewayModelRaw = {
  id?: string
  name?: string
  owned_by?: string
  description?: string
  type?: string
  tags?: string[]
  context_window?: number
  modalities?: {
    input?: string[]
    output?: string[]
  }
}

/**
 * Proxy AI Gateway's model catalog for the Stack Builder picker.
 *
 * Returns language models only (chat / agent capable). The list is what a
 * valid `AI_GATEWAY_API_KEY` can call through Vercel AI Gateway — users put
 * that key in the generated factory's `.env`, not on this marketing site.
 */
export async function GET() {
  try {
    const headers: HeadersInit = {
      Accept: "application/json",
    }
    // Optional: authenticated catalog if the site has a gateway key
    const apiKey = process.env.AI_GATEWAY_API_KEY
    if (apiKey) {
      headers.Authorization = `Bearer ${apiKey}`
    }

    const res = await fetch(GATEWAY_MODELS_URL, {
      headers,
      next: { revalidate: 3600 },
    })

    if (!res.ok) {
      const body = await res.text().catch(() => "")
      return NextResponse.json(
        {
          error: "Failed to fetch AI Gateway models",
          status: res.status,
          detail: body.slice(0, 200),
        },
        { status: 502 },
      )
    }

    const json = (await res.json()) as { data?: GatewayModelRaw[] }
    const raw = Array.isArray(json.data) ? json.data : []

    const models: GatewayModel[] = raw
      .filter((m) => typeof m.id === "string" && m.id.includes("/"))
      .filter((m) => isLanguageModel(m))
      .map((m) => {
        const id = m.id as string
        const provider = id.split("/")[0] ?? m.owned_by ?? "unknown"
        return {
          id,
          name: (m.name && m.name.trim()) || id.split("/")[1] || id,
          provider,
          description: m.description?.trim() || undefined,
          tags: Array.isArray(m.tags) ? m.tags : undefined,
          contextWindow:
            typeof m.context_window === "number" ? m.context_window : undefined,
        }
      })
      .sort((a, b) => {
        const p = a.provider.localeCompare(b.provider)
        if (p !== 0) return p
        return a.id.localeCompare(b.id)
      })

    return NextResponse.json(
      { models },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      },
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      { error: "Failed to fetch AI Gateway models", detail: message },
      { status: 502 },
    )
  }
}

function isLanguageModel(m: GatewayModelRaw): boolean {
  if (m.type === "language") return true
  // Fallback if type is missing: text in → text out, no embedding-only types
  if (m.type && m.type !== "language") return false
  const input = m.modalities?.input ?? []
  const output = m.modalities?.output ?? []
  return input.includes("text") && output.includes("text")
}
