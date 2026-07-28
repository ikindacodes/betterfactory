/** Shared AI Gateway model shape for API + Stack Builder picker. */
export type GatewayModel = {
  id: string
  name: string
  provider: string
  description?: string
  tags?: string[]
  contextWindow?: number
}
