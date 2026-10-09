import { useEffect, useState } from "preact/hooks";
import { EXAMPLE, parse, serialize, shareable } from "@humantxt/core";
import { Highlight } from "./Highlight.tsx";
import { entityLabel } from "./entities.ts";

const doc = parse(EXAMPLE).doc;
const CYCLE = ["commerce", "ai-agents", "*"];
const HIDDEN_IN_SHARE = new Set(["Updated"]);

/** The hero illustration: your whole file on the left, one entity's view on the right. */
export default function HeroSplit() {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setI((n) => (n + 1) % CYCLE.length), 3200);
    return () => clearInterval(t);
  }, [paused]);

  const layer = CYCLE[i]!;
  const shared = shareable(doc, [layer]);
  shared.header = shared.header.filter((e) => !HIDDEN_IN_SHARE.has(e.key));
  const out = serialize(shared).replace(/^# .*\n/, "");

  return (
    <div class="hero-split" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div class="hs-col">
        <p class="eyebrow">You write</p>
        <pre class="hs-code">
          <Highlight text={EXAMPLE.replace(/^#.*\n/gm, "")} />
        </pre>
      </div>
      <div class="hs-col hs-out">
        <p class="eyebrow">
          <span class="grad">{entityLabel(layer)}</span> sees
        </p>
        <div class="chips chips-sm" role="tablist" aria-label="Who is asking">
          {CYCLE.map((name, n) => (
            <button
              type="button"
              role="tab"
              aria-selected={n === i}
              class={n === i ? "chip chip-on" : "chip"}
              onClick={() => {
                setI(n);
                setPaused(true);
              }}
              key={name}
            >
              {entityLabel(name)}
            </button>
          ))}
        </div>
        <pre class="hs-code" aria-live="polite">
          <Highlight text={out} />
        </pre>
      </div>
    </div>
  );
}
