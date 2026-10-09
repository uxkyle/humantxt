import { test, expect, chromium, type BrowserContext, type Page } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { serveSite } from "./server.ts";

const EXTENSION = fileURLToPath(new URL("../.output/chrome-mv3", import.meta.url));
const SITE = fileURLToPath(new URL("../../../apps/site/dist", import.meta.url));

let context: BrowserContext;
let extensionId: string;
let site: ReturnType<typeof serveSite>;
let port: number;

test.beforeAll(async () => {
  site = serveSite(SITE);
  port = await site.listen();
  context = await chromium.launchPersistentContext("", {
    channel: "chromium",
    args: [`--disable-extensions-except=${EXTENSION}`, `--load-extension=${EXTENSION}`],
  });
  const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent("serviceworker"));
  extensionId = new URL(worker.url()).host;
});

test.afterAll(async () => {
  await context?.close();
  await site?.close();
});

type Received = { id: string; granted: string[]; layers: Record<string, Record<string, string>> };

async function openDemo(host: string): Promise<Page> {
  const page = await context.newPage();
  await page.goto(`http://${host}:${port}/demo/`);
  await expect(page.locator("#ua-status")).toHaveAttribute("data-state", "found");
  return page;
}

/** Click a request button and handle the consent window that opens. */
async function askWithConsent(page: Page, button: string, decide: (consent: Page) => Promise<void>) {
  const consentOpened = context.waitForEvent("page");
  await page.click(button);
  const consent = await consentOpened;
  await consent.waitForLoadState();
  await expect(consent.locator("#form")).toBeVisible();
  const closed = consent.waitForEvent("close");
  await decide(consent);
  await closed;
}

async function received(page: Page): Promise<Received> {
  await expect(page.locator("#received")).toContainText('"id"');
  return JSON.parse((await page.locator("#received").textContent()) ?? "{}");
}

test("announces itself with the Human-Txt header and nothing else", async () => {
  const page = await openDemo("localhost");
  expect(site.seenHeaders.filter(Boolean)).toContain("v=0.1");
  expect(site.seenHeaders.every((h) => h === undefined || h === "v=0.1")).toBe(true);
  await page.close();
});

test("asks first, shares only the granted layer, and remembers the grant", async () => {
  const page = await openDemo("localhost");

  await askWithConsent(page, "#ask-commerce", async (consent) => {
    await expect(consent.locator("#origin")).toHaveText(`http://localhost:${port}`);
    await expect(consent.locator("#purpose")).toContainText("personalise");
    await consent.click("#allow");
  });

  const first = await received(page);
  expect(first.id).toMatch(/^ht1_[a-z2-7]{26}$/);
  expect(first.granted).toEqual(["commerce"]);
  expect(first.layers.commerce).toMatchObject({ "Data-Sale": "disallow", Contact: "email", Personalization: "allow" });
  expect(first.layers.commerce).not.toHaveProperty("Memory");
  expect(Object.keys(first.layers)).toEqual(["commerce"]);
  await expect(page.locator("#sale-pill")).toBeVisible();

  // Second request for the same layer: no prompt, same ID.
  let prompted = false;
  const onPage = () => (prompted = true);
  context.on("page", onPage);
  await page.locator("#received").evaluate((el) => (el.textContent = ""));
  await page.click("#ask-commerce");
  const second = await received(page);
  context.off("page", onPage);
  expect(prompted).toBe(false);
  expect(second.id).toBe(first.id);

  // A new layer prompts again; declining rejects with HumanTxtDenied.
  await askWithConsent(page, "#ask-agent", (consent) => consent.click("#deny"));
  await expect(page.locator("#received")).toContainText("You declined");
  await page.close();
});

test("gives a different ID to a different origin", async () => {
  const a = await openDemo("localhost");
  const idA = (await (async () => {
    await a.click("#ask-commerce");
    return received(a);
  })()).id;

  const b = await openDemo("127.0.0.1");
  await askWithConsent(b, "#ask-commerce", (consent) => consent.click("#allow"));
  const idB = (await received(b)).id;

  expect(idB).toMatch(/^ht1_/);
  expect(idB).not.toBe(idA);
  await a.close();
  await b.close();
});

test("revoking a grant from the popup makes the site ask again", async () => {
  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${extensionId}/popup.html`);
  await popup.click("#t-sites");
  const row = popup.locator("#grants li", { hasText: `localhost:${port}` });
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: "Revoke" }).click();
  await expect(row).toHaveCount(0);
  await popup.close();

  const page = await openDemo("localhost");
  await askWithConsent(page, "#ask-commerce", (consent) => consent.click("#allow"));
  expect((await received(page)).granted).toEqual(["commerce"]);
  await page.close();
});

test("the popup editor validates and saves the file", async () => {
  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${extensionId}/popup.html`);
  const file = popup.locator("#file");
  await expect(popup.locator("#status")).toHaveText("Saved · valid v0.1");

  await file.fill((await file.inputValue()).replace("Contact: email", "Contact: carrier-pigeon"));
  await expect(popup.locator("#status")).toHaveText("1 error to fix");
  await expect(popup.locator("#save")).toBeDisabled();

  await file.fill((await file.inputValue()).replace("Contact: carrier-pigeon", "Contact: none"));
  await popup.click("#save");
  await expect(popup.locator("#status")).toHaveText("Saved · valid v0.1");
  await popup.close();

  // The shop now sees the saved value.
  const page = await openDemo("localhost");
  await page.click("#ask-commerce");
  expect((await received(page)).layers.commerce!.Contact).toBe("none");
  await expect(page.locator("#newsletter")).toBeDisabled();
  await page.close();
});
