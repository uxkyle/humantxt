/** Friendly names for the suggested layer names in spec §4. */
export const ENTITY_LABELS: Record<string, string> = {
  "*": "Anyone",
  commerce: "A storefront",
  media: "A news or social site",
  "ai-agents": "An AI agent",
  work: "Your employer",
  health: "A health service",
  finance: "Your bank",
  government: "A public service",
};

export function entityLabel(layer: string): string {
  return ENTITY_LABELS[layer] ?? `[${layer}]`;
}
