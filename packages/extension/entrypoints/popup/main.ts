import { parse, validate, type Diagnostic } from "@humantxt/core";
import { getFile, getGrants, revokeGrant, setFile } from "../../lib/store.ts";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const fileEl = $<HTMLTextAreaElement>("file");
const statusEl = $("status");
const saveBtn = $<HTMLButtonElement>("save");
const problemsEl = $("problems");

let saved = "";

// ---------- tabs ----------

for (const [tab, panel] of [
  ["t-file", "tab-file"],
  ["t-sites", "tab-sites"],
] as const) {
  $(tab).addEventListener("click", () => {
    for (const t of ["t-file", "t-sites"]) $(t).setAttribute("aria-selected", String(t === tab));
    for (const p of ["tab-file", "tab-sites"]) $(p).hidden = p !== panel;
    if (panel === "tab-sites") void renderGrants();
  });
}

// ---------- file ----------

function diagnose(text: string): Diagnostic[] {
  const { doc, diagnostics } = parse(text);
  return [...diagnostics, ...validate(doc)].sort((a, b) => a.line - b.line);
}

function refresh() {
  const text = fileEl.value;
  const diags = diagnose(text);
  const errors = diags.filter((d) => d.severity === "error").length;
  const dirty = text !== saved;

  problemsEl.replaceChildren(
    ...diags.map((d) => {
      const li = document.createElement("li");
      li.className = d.severity;
      const b = document.createElement("b");
      b.textContent = `Line ${d.line}`;
      li.append(b, d.message);
      return li;
    }),
  );

  saveBtn.disabled = !dirty || errors > 0;
  statusEl.className = errors ? "err" : dirty ? "dirty" : "ok";
  statusEl.textContent = errors ? `${errors} error${errors > 1 ? "s" : ""} to fix` : dirty ? "Unsaved changes" : "Saved · valid v0.1";
}

/** Keep the Updated header current whenever the file is saved. */
function stampUpdated(text: string): string {
  const today = new Date().toISOString().slice(0, 10);
  return /^Updated\s*:.*$/im.test(text) ? text.replace(/^Updated\s*:.*$/im, `Updated: ${today}`) : text;
}

saveBtn.addEventListener("click", async () => {
  const text = stampUpdated(fileEl.value);
  await setFile(text);
  saved = fileEl.value = text;
  refresh();
});

$("export").addEventListener("click", () => {
  const url = URL.createObjectURL(new Blob([fileEl.value], { type: "text/plain;charset=utf-8" }));
  Object.assign(document.createElement("a"), { href: url, download: "human.txt" }).click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

fileEl.addEventListener("input", refresh);
fileEl.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === "s") {
    e.preventDefault();
    if (!saveBtn.disabled) saveBtn.click();
  }
});

// ---------- grants ----------

async function renderGrants() {
  const list = $("grants");
  const grants = Object.entries(await getGrants()).sort((a, b) => b[1].grantedAt.localeCompare(a[1].grantedAt));
  if (!grants.length) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = "No site has asked yet.";
    list.replaceChildren(li);
    return;
  }
  list.replaceChildren(
    ...grants.map(([origin, g]) => {
      const li = document.createElement("li");
      const site = document.createElement("div");
      site.className = "site";
      const o = document.createElement("div");
      o.className = "origin";
      o.textContent = origin.replace(/^https:\/\//, "");
      o.title = origin;
      const l = document.createElement("div");
      l.className = "layers";
      l.textContent = g.layers.map((x) => `[${x}]`).join(" ") + ` · ${new Date(g.grantedAt).toLocaleDateString()}`;
      site.append(o, l);
      const btn = document.createElement("button");
      btn.className = "btn";
      btn.type = "button";
      btn.textContent = "Revoke";
      btn.addEventListener("click", async () => {
        await revokeGrant(origin);
        await renderGrants();
      });
      li.append(site, btn);
      return li;
    }),
  );
}

// ---------- init ----------

saved = fileEl.value = await getFile();
refresh();
