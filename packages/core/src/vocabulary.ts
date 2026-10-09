/**
 * Core keys defined by human.txt v0.1.
 *
 * Keys are case-insensitive in files; the `key` here is the canonical spelling
 * that `serialize` writes. Keys starting with `X-` are user extensions and are
 * never validated.
 */

export type ValueType =
  | { kind: "enum"; values: readonly string[] }
  | { kind: "list"; values?: readonly string[] }
  | { kind: "text" }
  | { kind: "duration" }
  | { kind: "date" }
  | { kind: "version" };

export type KeyGroup = "header" | "data" | "contact" | "ai" | "general";

export interface KeyDef {
  key: string;
  group: KeyGroup;
  type: ValueType;
  description: string;
}

const ALLOW = { kind: "enum", values: ["allow", "disallow"] } as const;
const ALLOW_ASK = { kind: "enum", values: ["allow", "ask", "disallow"] } as const;
const PREFERENCE = {
  kind: "enum",
  values: ["required", "preferred", "no-preference"],
} as const;

export const HEADER_KEYS: readonly KeyDef[] = [
  {
    key: "Version",
    group: "header",
    type: { kind: "version" },
    description: "The human.txt spec version this file follows. Required.",
  },
  {
    key: "Updated",
    group: "header",
    type: { kind: "date" },
    description: "When the file was last changed, as YYYY-MM-DD.",
  },
];

export const LAYER_KEYS: readonly KeyDef[] = [
  // General
  {
    key: "Applies-To",
    group: "general",
    type: { kind: "list" },
    description: "Plain-language note on who this layer is meant for. Informational only.",
  },
  {
    key: "Language",
    group: "general",
    type: { kind: "list" },
    description: "Preferred languages, most preferred first (BCP 47 tags such as en-US).",
  },
  {
    key: "Accessibility",
    group: "general",
    type: {
      kind: "list",
      values: ["reduced-motion", "high-contrast", "captions", "screen-reader", "plain-language", "large-text"],
    },
    description: "Accessibility needs the entity should honour.",
  },

  // Data use
  {
    key: "Tracking",
    group: "data",
    type: ALLOW,
    description: "Cross-site tracking, fingerprinting and third-party analytics.",
  },
  {
    key: "Data-Sale",
    group: "data",
    type: ALLOW,
    description: "Selling or renting personal data to third parties.",
  },
  {
    key: "Data-Share",
    group: "data",
    type: ALLOW_ASK,
    description: "Sharing personal data with partners for their own purposes.",
  },
  {
    key: "Personalization",
    group: "data",
    type: ALLOW,
    description: "Using behaviour on this site to tailor content or offers.",
  },
  {
    key: "Retention",
    group: "data",
    type: { kind: "duration" },
    description: "How long data may be kept: none, session, or a duration such as 30d, 6m, 1y.",
  },

  // Communication
  {
    key: "Contact",
    group: "contact",
    type: { kind: "list", values: ["none", "email", "sms", "push", "phone", "post", "in-app"] },
    description: "Channels the entity may use to reach out, or none.",
  },
  {
    key: "Contact-Frequency",
    group: "contact",
    type: { kind: "enum", values: ["never", "as-needed", "daily", "weekly", "monthly"] },
    description: "Maximum frequency of non-essential messages.",
  },

  // AI
  {
    key: "AI-Training",
    group: "ai",
    type: ALLOW,
    description: "Using my content or data to train or fine-tune AI models.",
  },
  {
    key: "AI-Summarize",
    group: "ai",
    type: ALLOW,
    description: "Summarising or quoting my content in AI-generated answers.",
  },
  {
    key: "AI-Inference",
    group: "ai",
    type: ALLOW,
    description: "Inferring sensitive traits (health, politics, finances, identity) from my data.",
  },
  {
    key: "Disclose-AI",
    group: "ai",
    type: PREFERENCE,
    description: "Whether the entity must say when I am talking to an AI rather than a person.",
  },
  {
    key: "Human-Escalation",
    group: "ai",
    type: PREFERENCE,
    description: "Whether I must be able to reach a human instead of an AI.",
  },
  {
    key: "Memory",
    group: "ai",
    type: { kind: "enum", values: ["none", "session-only", "persistent"] },
    description: "What an AI may remember about me between conversations.",
  },
  {
    key: "Act-On-My-Behalf",
    group: "ai",
    type: { kind: "enum", values: ["never", "ask-first", "allow"] },
    description: "Whether an AI agent may take actions (purchases, messages, bookings) for me.",
  },
  {
    key: "Tone",
    group: "ai",
    type: { kind: "text" },
    description: "How I like to be spoken to, in plain words (for example: direct, concise).",
  },
];

const byLower = new Map<string, KeyDef>();
for (const def of [...HEADER_KEYS, ...LAYER_KEYS]) byLower.set(def.key.toLowerCase(), def);

export function lookupKey(key: string): KeyDef | undefined {
  return byLower.get(key.toLowerCase());
}

export function isExtensionKey(key: string): boolean {
  return /^x-/i.test(key);
}

/** Canonical spelling for a key: the core spelling if known, otherwise as written. */
export function canonicalKey(key: string): string {
  return lookupKey(key)?.key ?? key;
}
