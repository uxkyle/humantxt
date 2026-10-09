import { browser } from "wxt/browser";
import type { ConsentDetails, Message } from "../../lib/messages.ts";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const reqId = new URLSearchParams(location.search).get("req") ?? "";

const LABELS: Record<string, string> = {
  "*": "Base layer (everyone)",
  commerce: "Shopping",
  media: "News & social",
  "ai-agents": "AI agents",
  work: "Work",
  health: "Health",
  finance: "Finance",
  government: "Public services",
};

async function send(msg: Message) {
  return browser.runtime.sendMessage(msg);
}

const details = (await send({ type: "consent-get", reqId })) as ConsentDetails | null;

if (!details) {
  $("loading").textContent = "This request has expired. You can close this window.";
} else {
  $("loading").hidden = true;
  $("form").hidden = false;
  $("origin").textContent = details.origin.replace(/^https:\/\//, "");
  $("origin").title = details.origin;
  $("purpose").textContent = details.purpose;
  document.title = `Share with ${new URL(details.origin).host}?`;

  $("layers").replaceChildren(
    ...details.requested.map((layer) => {
      const box = document.createElement("div");
      box.className = "layer";
      const label = document.createElement("label");
      const input = document.createElement("input");
      input.type = "checkbox";
      input.name = "layer";
      input.value = layer;
      input.checked = true;
      label.append(input, `${LABELS[layer] ?? layer} [${layer}]`);
      if (details.missing.includes(layer)) {
        const note = document.createElement("span");
        note.className = "note";
        note.textContent = "not in your file: sends base layer";
        label.append(note);
      } else if (details.previouslyGranted.includes(layer)) {
        const note = document.createElement("span");
        note.className = "note";
        note.textContent = "shared before";
        label.append(note);
      }
      const pre = document.createElement("pre");
      pre.textContent = details.previews[layer] ?? "";
      box.append(label, pre);
      return box;
    }),
  );

  const allow = $<HTMLButtonElement>("allow");
  const sync = () => {
    allow.disabled = !document.querySelector<HTMLInputElement>("input[name=layer]:checked");
  };
  $("layers").addEventListener("change", sync);
  sync();

  $("form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const granted = [...document.querySelectorAll<HTMLInputElement>("input[name=layer]:checked")].map((i) => i.value);
    await send({ type: "consent-decide", reqId, granted });
    window.close();
  });
  $("deny").addEventListener("click", async () => {
    await send({ type: "consent-decide", reqId, granted: [] });
    window.close();
  });
  allow.focus();
}
