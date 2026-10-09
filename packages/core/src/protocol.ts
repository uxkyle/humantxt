/**
 * The page-facing API a human.txt user agent (such as the browser extension)
 * exposes as `navigator.humanTxt`.
 */

export const HEADER_NAME = "Human-Txt";
export const HEADER_VALUE = "v=0.1";

export interface ShareRequest {
  /** Layer names the site wants, e.g. ["commerce"]. "*" asks for the base layer alone. */
  layers: string[];
  /** Shown to the person in the consent prompt. Say what you will do with it. */
  purpose: string;
}

export interface ShareResponse {
  version: string;
  /** Pairwise ID: stable for this origin, different on every other origin. */
  id: string;
  /** The subset of requested layers the person approved. */
  granted: string[];
  /** Each granted layer, already merged with the [*] base layer. */
  layers: Record<string, Record<string, string>>;
  /** The same data as human.txt text. */
  text: string;
}

export interface HumanTxtAPI {
  version: string;
  request(req: ShareRequest): Promise<ShareResponse>;
}

/** Name of the error a request rejects with when the person declines. */
export const DENIED_ERROR = "HumanTxtDenied";
