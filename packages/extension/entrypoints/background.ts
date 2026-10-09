import { browser, type Browser } from "wxt/browser";
import {
  DENIED_ERROR,
  SPEC_VERSION,
  hasLayer,
  pairwiseId,
  parse,
  serialize,
  shareable,
  type ShareRequest,
  type ShareResponse,
} from "@humantxt/core";
import { getFile, getGrants, getSecret, setGrant } from "../lib/store.ts";
import type { ConsentDetails, Message, ShareResult } from "../lib/messages.ts";

interface Pending {
  origin: string;
  request: ShareRequest;
  windowId?: number;
  resolve: (granted: string[]) => void;
}

// Requests waiting on the consent window. The open message channel to the
// content script keeps the service worker alive while the person decides.
const pending = new Map<string, Pending>();

export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(() => void getSecret());

  browser.runtime.onMessage.addListener((msg: Message, sender, sendResponse) => {
    handle(msg, sender).then(sendResponse, (err: Error) => sendResponse({ ok: false, error: err.message }));
    return true;
  });

  browser.windows.onRemoved.addListener((windowId) => {
    for (const [id, p] of pending) {
      if (p.windowId === windowId) {
        pending.delete(id);
        p.resolve([]);
      }
    }
  });
});

async function handle(msg: Message, sender: Browser.runtime.MessageSender): Promise<unknown> {
  switch (msg.type) {
    case "share-request":
      return share(msg.request, sender);
    case "consent-get":
      return consentDetails(msg.reqId);
    case "consent-decide": {
      const p = pending.get(msg.reqId);
      if (!p) return null;
      pending.delete(msg.reqId);
      p.resolve(msg.granted.filter((l) => p.request.layers.includes(l)));
      if (p.windowId !== undefined) browser.windows.remove(p.windowId).catch(() => {});
      return null;
    }
  }
}

async function share(request: ShareRequest, sender: Browser.runtime.MessageSender): Promise<ShareResult> {
  // Trust the browser's view of who is asking, never anything the page says.
  const origin = sender.url ? new URL(sender.url).origin : null;
  if (!origin || !/^https?:/.test(origin)) return { ok: false, error: "human.txt is only available to http(s) pages." };

  const layers = [...new Set(request.layers.map((l) => l.toLowerCase().trim()))].filter((l) => /^(\*|[a-z0-9][a-z0-9-]*)$/.test(l));
  if (!layers.length) return { ok: false, error: "Ask for at least one layer, e.g. { layers: ['commerce'] }." };
  const purpose = String(request.purpose ?? "").slice(0, 500);
  if (!purpose.trim()) return { ok: false, error: "Say why you are asking: request({ layers, purpose })." };

  const existing = (await getGrants())[origin];
  let granted: string[];
  if (existing && layers.every((l) => existing.layers.includes(l))) {
    granted = layers;
  } else {
    granted = await askPerson(origin, { layers, purpose }, sender.tab?.windowId);
    if (!granted.length) return { ok: false, name: DENIED_ERROR, error: "The person declined to share their human.txt." };
    const all = [...new Set([...(existing?.layers ?? []), ...granted])];
    await setGrant(origin, { layers: all, purpose, grantedAt: new Date().toISOString() });
  }

  return { ok: true, response: await buildResponse(origin, granted) };
}

async function buildResponse(origin: string, granted: string[]): Promise<ShareResponse> {
  const { doc } = parse(await getFile());
  const shared = shareable(doc, granted);
  const layers: ShareResponse["layers"] = {};
  for (const layer of shared.layers) layers[layer.name] = Object.fromEntries(layer.entries.map((e) => [e.key, e.value]));
  return {
    version: SPEC_VERSION,
    id: await pairwiseId(await getSecret(), origin),
    granted,
    layers,
    text: serialize(shared),
  };
}

async function askPerson(origin: string, request: ShareRequest, parentWindowId?: number): Promise<string[]> {
  const reqId = crypto.randomUUID();
  const decided = new Promise<string[]>((resolve) => pending.set(reqId, { origin, request, resolve }));

  const width = 440;
  const height = 640;
  let position: { left?: number; top?: number } = {};
  if (parentWindowId !== undefined) {
    const parent = await browser.windows.get(parentWindowId).catch(() => null);
    if (parent?.left !== undefined && parent.width !== undefined && parent.top !== undefined) {
      position = { left: parent.left + parent.width - width - 24, top: parent.top + 80 };
    }
  }
  const options = { url: browser.runtime.getURL(`/consent.html?req=${reqId}`), type: "popup" as const, width, height };
  // Placing it beside the browser window can land off-screen on small displays; let the browser place it then.
  const win = await browser.windows.create({ ...options, ...position }).catch(() => browser.windows.create(options));
  const p = pending.get(reqId);
  if (p) p.windowId = win?.id;
  return decided;
}

async function consentDetails(reqId: string): Promise<ConsentDetails | null> {
  const p = pending.get(reqId);
  if (!p) return null;
  const { doc } = parse(await getFile());
  const previews: Record<string, string> = {};
  for (const layer of p.request.layers) {
    previews[layer] = serialize(shareable(doc, [layer])).replace(/^# .*\n/, "");
  }
  const existing = (await getGrants())[p.origin];
  return {
    origin: p.origin,
    purpose: p.request.purpose,
    requested: p.request.layers,
    previouslyGranted: existing?.layers ?? [],
    previews,
    missing: p.request.layers.filter((l) => l !== "*" && !hasLayer(doc, l)),
  };
}
