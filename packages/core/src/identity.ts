/**
 * Pairwise identifiers.
 *
 * Each origin sees a different ID derived from a secret that never leaves the
 * user's device: HMAC-SHA256(secret, origin), truncated to 128 bits and
 * base32-encoded. One site can recognise a returning visitor; two sites cannot
 * compare IDs to learn they share one.
 */

const ID_PREFIX = "ht1_";
const ALPHABET = "abcdefghijklmnopqrstuvwxyz234567";

export function generateSecret(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(32));
}

/** Reduce any URL or origin string to its origin, e.g. "https://shop.example". */
export function normalizeOrigin(urlOrOrigin: string): string {
  const origin = new URL(urlOrOrigin).origin;
  if (origin === "null") throw new Error(`Cannot derive an origin from ${urlOrOrigin}`);
  return origin;
}

export async function pairwiseId(secret: Uint8Array, urlOrOrigin: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", secret as BufferSource, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(normalizeOrigin(urlOrOrigin)));
  return ID_PREFIX + base32(new Uint8Array(mac).slice(0, 16));
}

function base32(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

export function encodeSecret(secret: Uint8Array): string {
  return btoa(String.fromCharCode(...secret));
}

export function decodeSecret(encoded: string): Uint8Array {
  return Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
}
