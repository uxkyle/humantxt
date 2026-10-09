import { browser } from "wxt/browser";
import { EXAMPLE, decodeSecret, encodeSecret, generateSecret } from "@humantxt/core";

/** A person's approval for one origin to read specific layers. */
export interface Grant {
  layers: string[];
  purpose: string;
  grantedAt: string;
}

export type Grants = Record<string, Grant>;

interface Stored {
  file?: string;
  secret?: string;
  grants?: Grants;
}

const local = browser.storage.local;

export async function getFile(): Promise<string> {
  const { file } = (await local.get("file")) as Stored;
  return file ?? EXAMPLE;
}

export async function setFile(file: string): Promise<void> {
  await local.set({ file });
}

/** The device secret behind every pairwise ID. Created once, never sent anywhere. */
export async function getSecret(): Promise<Uint8Array> {
  const { secret } = (await local.get("secret")) as Stored;
  if (secret) return decodeSecret(secret);
  const fresh = generateSecret();
  await local.set({ secret: encodeSecret(fresh) });
  return fresh;
}

export async function getGrants(): Promise<Grants> {
  const { grants } = (await local.get("grants")) as Stored;
  return grants ?? {};
}

export async function setGrant(origin: string, grant: Grant): Promise<void> {
  const grants = await getGrants();
  grants[origin] = grant;
  await local.set({ grants });
}

export async function revokeGrant(origin: string): Promise<void> {
  const grants = await getGrants();
  delete grants[origin];
  await local.set({ grants });
}
