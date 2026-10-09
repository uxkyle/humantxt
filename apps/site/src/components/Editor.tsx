import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { EXAMPLE, parse, serialize, shareable, validate, BASE_LAYER } from "@humantxt/core";
import { Highlight } from "./Highlight.tsx";
import { entityLabel } from "./entities.ts";

const STORAGE_KEY = "humantxt:draft";

function loadDraft(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? EXAMPLE;
  } catch {
    return EXAMPLE;
  }
}

export default function Editor() {
  const [text, setText] = useState(EXAMPLE);
  const [selected, setSelected] = useState("commerce");
  const [copied, setCopied] = useState(false);
  const backdrop = useRef<HTMLPreElement>(null);

  useEffect(() => setText(loadDraft()), []);
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, text);
    } catch {
      /* storage unavailable: the editor still works, it just won't remember */
    }
  }, [text]);

  const { doc, diagnostics } = useMemo(() => {
    const parsed = parse(text);
    return { doc: parsed.doc, diagnostics: [...parsed.diagnostics, ...validate(parsed.doc)].sort((a, b) => a.line - b.line) };
  }, [text]);

  const layers = doc.layers.map((l) => l.name);
  const target = layers.includes(selected) ? selected : (layers.find((l) => l !== BASE_LAYER) ?? BASE_LAYER);
  const preview = serialize(shareable(doc, [target]));
  const errorLines = new Set(diagnostics.filter((d) => d.severity === "error").map((d) => d.line));
  const errorCount = errorLines.size;

  const download = () => {
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: "human.txt" });
    a.click();
    URL.revokeObjectURL(url);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked; the download button still works */
    }
  };

  return (
    <div class="editor">
      <div class="pane">
        <div class="pane-bar">
          <span class="dots" aria-hidden="true"><i /><i /><i /></span>
          <span class="pane-title">human.txt</span>
          <span class="pane-tag">You write</span>
        </div>
        <div class="code-edit">
          <pre class="code-backdrop" ref={backdrop} aria-hidden="true">
            <Highlight text={text + "\n"} errorLines={errorLines} />
          </pre>
          <textarea
            value={text}
            spellcheck={false}
            autocapitalize="off"
            autocomplete="off"
            aria-label="Your human.txt file"
            onInput={(e) => setText(e.currentTarget.value)}
            onScroll={(e) => {
              if (backdrop.current) {
                backdrop.current.scrollTop = e.currentTarget.scrollTop;
                backdrop.current.scrollLeft = e.currentTarget.scrollLeft;
              }
            }}
          />
        </div>
        <div class="pane-foot">
          <span class={errorCount ? "status status-err" : "status status-ok"} role="status">
            {errorCount ? `${errorCount} line${errorCount > 1 ? "s need" : " needs"} fixing` : "Valid human.txt v0.1"}
          </span>
          <span class="actions">
            <button class="btn btn-sm" type="button" onClick={() => setText(EXAMPLE)}>Reset</button>
            <button class="btn btn-sm" type="button" onClick={copy}>{copied ? "Copied" : "Copy"}</button>
            <button class="btn btn-sm btn-primary" type="button" onClick={download}>Download</button>
          </span>
        </div>
      </div>

      <div class="pane pane-out">
        <div class="pane-bar">
          <span class="pane-title">What they see</span>
          <span class="pane-tag pane-tag-alt">Shared</span>
        </div>
        <div class="chips" role="radiogroup" aria-label="Who is asking">
          {layers.map((name) => (
            <button
              type="button"
              role="radio"
              aria-checked={name === target}
              class={name === target ? "chip chip-on" : "chip"}
              onClick={() => setSelected(name)}
              key={name}
            >
              {entityLabel(name)}
            </button>
          ))}
        </div>
        <pre class="code-out">
          <Highlight text={preview} />
        </pre>
        <p class="pane-note">
          Only the <code>[{target}]</code> layer, merged with <code>[*]</code>. Nothing else in your file leaves your device.
        </p>
      </div>

      {diagnostics.length > 0 && (
        <ul class="diags" aria-label="Problems">
          {diagnostics.map((d, i) => (
            <li class={`diag diag-${d.severity}`} key={i}>
              <span class="diag-line">Line {d.line}</span> {d.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
