import { SPEC_VERSION, type HumanTxtAPI, type ShareRequest, type ShareResponse } from "@humantxt/core";
import { PAGE_CHANNEL, type PageMessage } from "../lib/messages.ts";

/**
 * Runs in the page's own JavaScript world and defines `navigator.humanTxt`.
 * It has no extension privileges: every request is relayed through the
 * isolated bridge script to the background, which asks the person.
 */
export default defineContentScript({
  matches: ["http://*/*", "https://*/*"],
  world: "MAIN",
  runAt: "document_start",
  main() {
    const waiting = new Map<string, { resolve: (r: ShareResponse) => void; reject: (e: Error) => void }>();

    window.addEventListener("message", (event: MessageEvent<PageMessage>) => {
      const msg = event.data;
      if (event.source !== window || msg?.channel !== PAGE_CHANNEL || msg.kind !== "response") return;
      const w = waiting.get(msg.id);
      if (!w) return;
      waiting.delete(msg.id);
      if (msg.result.ok) {
        w.resolve(msg.result.response);
      } else {
        const err = new Error(msg.result.error);
        err.name = msg.result.name ?? "HumanTxtError";
        w.reject(err);
      }
    });

    const api: HumanTxtAPI = Object.freeze({
      version: SPEC_VERSION,
      request(request: ShareRequest) {
        return new Promise<ShareResponse>((resolve, reject) => {
          if (!request || !Array.isArray(request.layers) || typeof request.purpose !== "string") {
            reject(new TypeError("request({ layers: string[], purpose: string })"));
            return;
          }
          const id = crypto.randomUUID();
          waiting.set(id, { resolve, reject });
          const msg: PageMessage = {
            channel: PAGE_CHANNEL,
            kind: "request",
            id,
            request: { layers: request.layers.map(String), purpose: request.purpose },
          };
          window.postMessage(msg, window.location.origin);
        });
      },
    });

    Object.defineProperty(navigator, "humanTxt", { value: api, enumerable: true, configurable: false, writable: false });
    window.dispatchEvent(new Event("humantxt:ready"));
  },
});
