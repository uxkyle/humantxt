import { Fragment } from "preact";

/** Read-only syntax highlighting for human.txt text. */
export function Highlight({ text, errorLines }: { text: string; errorLines?: Set<number> }) {
  const lines = text.replace(/\n$/, "").split("\n");
  return (
    <code class="hl">
      {lines.map((line, i) => (
        <Fragment key={i}>
          <span class={`hl-line${errorLines?.has(i + 1) ? " hl-err" : ""}`}>{renderLine(line)}</span>
          {"\n"}
        </Fragment>
      ))}
    </code>
  );
}

function renderLine(line: string) {
  const t = line.trim();
  if (t.startsWith("#")) return <span class="hl-comment">{line}</span>;
  if (t.startsWith("[")) return <span class="hl-layer">{line}</span>;
  const m = /^(\s*)([A-Za-z][A-Za-z0-9-]*)(\s*:\s*)(.*)$/.exec(line);
  if (!m) return line;
  return (
    <>
      {m[1]}
      <span class="hl-key">{m[2]}</span>
      <span class="hl-punct">{m[3]}</span>
      <span class={valueClass(m[4]!)}>{m[4]}</span>
    </>
  );
}

function valueClass(v: string) {
  const s = v.trim().toLowerCase();
  if (["disallow", "never", "none", "required"].includes(s)) return "hl-val hl-no";
  if (["allow", "persistent"].includes(s)) return "hl-val hl-yes";
  return "hl-val";
}
