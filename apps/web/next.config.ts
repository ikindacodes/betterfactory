import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  transpilePackages: ["@workspace/ui", "create-betterfactory"],
  // Transform barrel imports (lucide, motion icons, etc.) into direct paths.
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "motion",
      "create-betterfactory",
    ],
  },
}

export default nextConfig
