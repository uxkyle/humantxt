import { browser } from "wxt/browser";
import { PAGE_CHANNEL, type Message, type PageMessage, type ShareResult } from "../lib/messages.ts";

/** Relays navigator.humanTxt requests from the page to the background and back. */
export default defineContentScript({
  matches: ["http://*/*", "https://*/*"],
  runAt: "document_start",
  main() {
    window.addEventListener("message", async (event: MessageEvent<PageMessage>) => {
      const msg = event.data;
      if (event.source !== window || msg?.channel !== PAGE_CHANNEL || msg.kind !== "request") return;

      let result: ShareResult;
      try {
        const out: Message = { type: "share-request", request: msg.request };
        result = (await browser.runtime.sendMessage(out)) as ShareResult;
      } catch (err) {
        result = { ok: false, error: `human.txt extension unavailable: ${(err as Error).message}` };
      }
      const reply: PageMessage = { channel: PAGE_CHANNEL, kind: "response", id: msg.id, result };
      window.postMessage(reply, window.location.origin);
    });
  },
});
