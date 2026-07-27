import { ImageResponse } from "next/og"
import { SITE } from "@/lib/site"

export const alt = `${SITE.name} — ${SITE.tagline}`

export const size = {
  width: 1200,
  height: 630,
}

export const contentType = "image/png"

export default function TwitterImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#0c0f12",
          color: "#f4f7f8",
          padding: "72px 80px",
          fontFamily:
            "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              fontSize: 28,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#8aa0a8",
            }}
          >
            {SITE.name}
          </div>
          <div
            style={{
              fontSize: 20,
              color: "#5c727a",
              letterSpacing: "0.08em",
            }}
          >
            create-betterfactory
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              fontSize: 72,
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              maxWidth: 920,
              fontWeight: 600,
            }}
          >
            {SITE.tagline}
          </div>
          <div
            style={{
              fontSize: 28,
              lineHeight: 1.35,
              color: "#9bb0b8",
              maxWidth: 820,
            }}
          >
            Compose an eve stack. Copy one command. Own the factory.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontSize: 22,
            color: "#6d858e",
          }}
        >
          <div
            style={{
              border: "1px solid #2a3a40",
              padding: "10px 16px",
              color: "#c5d4d9",
            }}
          >
            npx create-betterfactory@latest
          </div>
          <div>github.com/ikindacodes/betterfactory</div>
        </div>
      </div>
    ),
    {
      ...size,
    },
  )
}
