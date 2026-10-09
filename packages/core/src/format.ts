import { HEADER_KEYS, canonicalKey, isExtensionKey, lookupKey, type KeyDef } from "./vocabulary.ts";

export const SPEC_VERSION = "0.1";
export const BASE_LAYER = "*";

export interface Entry {
  key: string;
  value: string;
  /** 1-based source line, or 0 for entries created in code. */
  line: number;
}

export interface Layer {
  name: string;
  entries: Entry[];
  line: number;
}

export interface HumanTxt {
  header: Entry[];
  layers: Layer[];
}

export interface Diagnostic {
  line: number;
  severity: "error" | "warning";
  message: string;
}

export interface ParseResult {
  doc: HumanTxt;
  diagnostics: Diagnostic[];
}

const LAYER_RE = /^\[\s*(\*|[a-z0-9][a-z0-9-]*)\s*\]$/;
const ENTRY_RE = /^([A-Za-z][A-Za-z0-9-]*)\s*:\s*(.*)$/;

/**
 * Parse human.txt text. Never throws: syntax problems are reported as
 * diagnostics and the offending line is skipped.
 */
export function parse(text: string): ParseResult {
  const doc: HumanTxt = { header: [], layers: [] };
  const diagnostics: Diagnostic[] = [];
  let current: Layer | null = null;

  text.split(/\r?\n/).forEach((raw, i) => {
    const line = i + 1;
    const trimmed = raw.trim();
    if (trimmed === "" || trimmed.startsWith("#")) return;

    if (trimmed.startsWith("[")) {
      const m = LAYER_RE.exec(trimmed.toLowerCase());
      if (!m) {
        diagnostics.push({
          line,
          severity: "error",
          message: `Invalid layer name "${trimmed}". Use [*] or lowercase letters, digits and dashes, e.g. [ai-agents].`,
        });
        current = null;
        return;
      }
      const name = m[1]!;
      if (doc.layers.some((l) => l.name === name)) {
        diagnostics.push({ line, severity: "error", message: `Layer [${name}] is defined more than once.` });
        current = null;
        return;
      }
      current = { name, entries: [], line };
      doc.layers.push(current);
      return;
    }

    const m = ENTRY_RE.exec(trimmed);
    if (!m) {
      diagnostics.push({ line, severity: "error", message: `Expected "Key: value", a [layer] or a # comment.` });
      return;
    }
    const entry: Entry = { key: canonicalKey(m[1]!), value: m[2]!.trim(), line };
    const target: Entry[] = current ? current.entries : doc.header;
    if (target.some((e) => e.key.toLowerCase() === entry.key.toLowerCase())) {
      diagnostics.push({
        line,
        severity: "error",
        message: `${entry.key} is set more than once in ${current ? `[${current.name}]` : "the header"}.`,
      });
      return;
    }
    target.push(entry);
  });

  return { doc, diagnostics };
}

/** Write a document back out in canonical form. Comments are not preserved. */
export function serialize(doc: HumanTxt): string {
  const out: string[] = ["# human.txt — https://humantxt.org"];
  for (const e of doc.header) out.push(`${e.key}: ${e.value}`);
  for (const layer of doc.layers) {
    out.push("", `[${layer.name}]`);
    for (const e of layer.entries) out.push(`${e.key}: ${e.value}`);
  }
  return out.join("\n") + "\n";
}

/** Check values against the v0.1 vocabulary. Unknown core keys are warnings, not errors. */
export function validate(doc: HumanTxt): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const version = doc.header.find((e) => e.key === "Version");
  if (!version) {
    diagnostics.push({ line: 1, severity: "error", message: `Missing "Version: ${SPEC_VERSION}" before the first layer.` });
  }
  if (!doc.layers.some((l) => l.name === BASE_LAYER)) {
    diagnostics.push({ line: 1, severity: "warning", message: "No [*] base layer. Every entity will see only the layer it is granted." });
  }

  for (const e of doc.header) {
    const def = HEADER_KEYS.find((d) => d.key === e.key);
    if (!def && !isExtensionKey(e.key)) {
      diagnostics.push({ line: e.line, severity: "warning", message: `${e.key} is not a header key and will be ignored.` });
    } else if (def) {
      checkValue(def, e, diagnostics);
    }
  }

  for (const layer of doc.layers) {
    for (const e of layer.entries) {
      if (isExtensionKey(e.key)) continue;
      const def = lookupKey(e.key);
      if (!def) {
        diagnostics.push({
          line: e.line,
          severity: "warning",
          message: `${e.key} is not a v${SPEC_VERSION} key. Readers will ignore it; prefix custom keys with X-.`,
        });
      } else if (def.group === "header") {
        diagnostics.push({ line: e.line, severity: "error", message: `${e.key} belongs in the header, above the first layer.` });
      } else {
        checkValue(def, e, diagnostics);
      }
    }
  }
  return diagnostics;
}

function checkValue(def: KeyDef, e: Entry, out: Diagnostic[]): void {
  const v = e.value.toLowerCase();
  const fail = (message: string): void => void out.push({ line: e.line, severity: "error", message });
  if (v === "") return fail(`${e.key} has no value.`);

  switch (def.type.kind) {
    case "enum":
      if (!def.type.values.includes(v)) fail(`${e.key} must be one of: ${def.type.values.join(", ")}.`);
      break;
    case "list": {
      const allowed = def.type.values;
      if (!allowed) break;
      const bad = splitList(v).filter((item) => !allowed.includes(item));
      if (bad.length) fail(`${e.key} has unknown value${bad.length > 1 ? "s" : ""} ${bad.join(", ")}. Allowed: ${allowed.join(", ")}.`);
      break;
    }
    case "duration":
      if (!/^(none|session|\d+[dmy])$/.test(v)) fail(`${e.key} must be none, session, or a number followed by d, m or y (e.g. 90d).`);
      break;
    case "date":
      if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(Date.parse(v))) fail(`${e.key} must be a date like 2026-10-09.`);
      break;
    case "version":
      if (v !== SPEC_VERSION) {
        out.push({ line: e.line, severity: "warning", message: `This reader understands version ${SPEC_VERSION}; file says ${e.value}.` });
      }
      break;
    case "text":
      break;
  }
}

export function splitList(value: string): string[] {
  return value
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function layerNames(doc: HumanTxt): string[] {
  return doc.layers.map((l) => l.name);
}

export function hasLayer(doc: HumanTxt, name: string): boolean {
  return doc.layers.some((l) => l.name === name);
}

/**
 * The effective preferences for one layer: the [*] base layer with the named
 * layer's entries on top. Asking for a layer the file doesn't define returns
 * just the base layer.
 */
export function resolveLayer(doc: HumanTxt, name: string): Record<string, string> {
  const result: Record<string, string> = {};
  const base = doc.layers.find((l) => l.name === BASE_LAYER);
  for (const e of base?.entries ?? []) result[e.key] = e.value;
  if (name !== BASE_LAYER) {
    for (const e of doc.layers.find((l) => l.name === name)?.entries ?? []) result[e.key] = e.value;
  }
  return result;
}

/**
 * Build the document an entity is allowed to see: the header plus each granted
 * layer, already merged with [*]. The base layer itself is only included when
 * it is granted explicitly.
 */
export function shareable(doc: HumanTxt, granted: readonly string[]): HumanTxt {
  return {
    header: doc.header.filter((e) => e.key === "Version" || e.key === "Updated"),
    layers: granted.map((name) => ({
      name,
      line: 0,
      entries: Object.entries(resolveLayer(doc, name)).map(([key, value]) => ({ key, value, line: 0 })),
    })),
  };
}
