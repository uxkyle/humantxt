import { describe, expect, it } from "vitest";
import {
  EXAMPLE,
  pairwiseId,
  parse,
  resolveLayer,
  serialize,
  shareable,
  validate,
  decodeSecret,
  encodeSecret,
  generateSecret,
} from "../src/index.ts";

const errors = (text: string) => {
  const { doc, diagnostics } = parse(text);
  return [...diagnostics, ...validate(doc)].filter((d) => d.severity === "error");
};

describe("parse", () => {
  it("reads the example without diagnostics", () => {
    const { doc, diagnostics } = parse(EXAMPLE);
    expect(diagnostics).toEqual([]);
    expect(validate(doc)).toEqual([]);
    expect(doc.layers.map((l) => l.name)).toEqual(["*", "commerce", "ai-agents"]);
    expect(doc.header).toMatchObject([
      { key: "Version", value: "0.1" },
      { key: "Updated", value: "2026-10-09" },
    ]);
  });

  it("canonicalises key case and layer case", () => {
    const { doc } = parse("version: 0.1\n[Commerce]\nai-training: disallow\n");
    expect(doc.header[0]!.key).toBe("Version");
    expect(doc.layers[0]).toMatchObject({ name: "commerce", entries: [{ key: "AI-Training" }] });
  });

  it("keeps # inside values", () => {
    const { doc } = parse("Version: 0.1\n[*]\nTone: friendly #nofluff\n");
    expect(resolveLayer(doc, "*").Tone).toBe("friendly #nofluff");
  });

  it("reports syntax errors with line numbers and keeps going", () => {
    const { doc, diagnostics } = parse("Version: 0.1\n[*]\nthis is not valid\n[Bad Name]\nTracking: disallow\n");
    expect(diagnostics.map((d) => d.line)).toEqual([3, 4]);
    expect(doc.layers).toHaveLength(1);
  });

  it("rejects duplicate keys and layers", () => {
    const { diagnostics } = parse("Version: 0.1\n[*]\nTracking: allow\ntracking: disallow\n[*]\n");
    expect(diagnostics.map((d) => d.line)).toEqual([4, 5]);
  });
});

describe("serialize", () => {
  it("round-trips", () => {
    const first = parse(EXAMPLE).doc;
    const second = parse(serialize(first)).doc;
    const strip = (d: typeof first) => JSON.parse(JSON.stringify(d, (k, v) => (k === "line" ? undefined : v)));
    expect(strip(second)).toEqual(strip(first));
  });
});

describe("validate", () => {
  it("requires a version", () => {
    expect(errors("[*]\nTracking: disallow\n").map((d) => d.message)).toEqual([
      'Missing "Version: 0.1" before the first layer.',
    ]);
  });

  it("checks enum, list, duration and date values", () => {
    const text = [
      "Version: 0.1",
      "Updated: yesterday",
      "[*]",
      "Tracking: maybe",
      "Contact: email, carrier-pigeon",
      "Retention: forever",
      "Memory: persistent",
    ].join("\n");
    expect(errors(text).map((d) => d.line)).toEqual([2, 4, 5, 6]);
  });

  it("warns on unknown keys but allows X- keys", () => {
    const { doc } = parse("Version: 0.1\n[*]\nFavourite-Colour: blue\nX-Favourite-Colour: blue\n");
    expect(validate(doc)).toEqual([expect.objectContaining({ line: 3, severity: "warning" })]);
  });

  it("flags header keys inside a layer", () => {
    expect(errors("Version: 0.1\n[*]\nUpdated: 2026-10-09\n").map((d) => d.line)).toEqual([3]);
  });
});

describe("layers", () => {
  const { doc } = parse(EXAMPLE);

  it("merges a layer over the base layer", () => {
    const commerce = resolveLayer(doc, "commerce");
    expect(commerce.Contact).toBe("email");
    expect(commerce["Data-Sale"]).toBe("disallow");
    expect(commerce).not.toHaveProperty("Memory");
  });

  it("falls back to the base layer for unknown layer names", () => {
    expect(resolveLayer(doc, "healthcare")).toEqual(resolveLayer(doc, "*"));
  });

  it("only shares granted layers", () => {
    const shared = shareable(doc, ["commerce"]);
    expect(shared.layers.map((l) => l.name)).toEqual(["commerce"]);
    expect(serialize(shared)).not.toContain("Act-On-My-Behalf");
    expect(serialize(shared)).toContain("Data-Sale: disallow");
  });
});

describe("pairwiseId", () => {
  const secret = new Uint8Array(32).fill(7);

  it("is stable per origin and ignores path", async () => {
    const a = await pairwiseId(secret, "https://storefront.example/cart?x=1");
    const b = await pairwiseId(secret, "https://storefront.example");
    expect(a).toBe(b);
    expect(a).toMatch(/^ht1_[a-z2-7]{26}$/);
  });

  it("differs across origins and secrets", async () => {
    const a = await pairwiseId(secret, "https://storefront.example");
    expect(await pairwiseId(secret, "https://news.example")).not.toBe(a);
    expect(await pairwiseId(secret, "http://storefront.example")).not.toBe(a);
    expect(await pairwiseId(new Uint8Array(32).fill(8), "https://storefront.example")).not.toBe(a);
  });

  it("round-trips secrets through storage encoding", () => {
    const s = generateSecret();
    expect(decodeSecret(encodeSecret(s))).toEqual(s);
  });
});
