import type { ShareRequest, ShareResponse } from "@humantxt/core";

/** Messages between the page bridge, the consent window and the background. */
export type Message =
  | { type: "share-request"; request: ShareRequest }
  | { type: "consent-get"; reqId: string }
  | { type: "consent-decide"; reqId: string; granted: string[] };

export type ShareResult = { ok: true; response: ShareResponse } | { ok: false; error: string; name?: string };

export interface ConsentDetails {
  origin: string;
  purpose: string;
  requested: string[];
  /** Layers this origin was already granted; pre-checked in the prompt. */
  previouslyGranted: string[];
  /** What each requested layer would share, as human.txt text. */
  previews: Record<string, string>;
  /** Requested layers the file doesn't define; they fall back to [*]. */
  missing: string[];
}

/** window.postMessage envelope between the MAIN-world API and the isolated bridge. */
export const PAGE_CHANNEL = "humantxt";

export type PageMessage =
  | { channel: typeof PAGE_CHANNEL; kind: "request"; id: string; request: ShareRequest }
  | { channel: typeof PAGE_CHANNEL; kind: "response"; id: string; result: ShareResult };
