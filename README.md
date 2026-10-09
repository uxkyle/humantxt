# human.txt

**robots.txt lets websites set rules for machines. human.txt lets you set rules for them.**

human.txt is an open standard and browser extension. With it, a person keeps one plain-text file that tells websites, apps and AI agents what they may use, what they may not, and how that person wants to be treated. The file is split into **layers**, so a shop, an AI assistant and a news site each see only the part meant for them.

- Website: [humantxt.org](https://humantxt.org)
- Spec: [`spec/human-txt-v0.1.md`](spec/human-txt-v0.1.md) (draft)
- Demo: [humantxt.org/demo](https://humantxt.org/demo)

```
Version: 0.1

[*]
Tracking: disallow
Data-Sale: disallow
AI-Training: disallow

[commerce]
Personalization: allow
Contact: email
Contact-Frequency: weekly

[ai-agents]
Disclose-AI: required
Act-On-My-Behalf: ask-first
Tone: direct, concise
```

## How it works

1. **Own.** Your file lives in the browser extension on your device. There are no accounts and no server.
2. **Layer.** A `[*]` base layer applies to everyone. Each other layer overrides only what it needs to.
3. **Share.** A site calls `navigator.humanTxt.request({ layers, purpose })`. You see who is asking and why, and you approve each layer. Each site gets a **pairwise ID** that is different on every site, so the ID can't be used to track you across the web.

The extension also adds a `Human-Txt: v=0.1` request header. It tells servers you have a human.txt, and nothing else.

## Repository

| Path | What |
|---|---|
| [`spec/`](spec) | The human.txt specification (CC BY 4.0) |
| [`packages/core`](packages/core) | `@humantxt/core`: parser, validator, layer resolution and pairwise IDs. No dependencies. |
| [`packages/extension`](packages/extension) | The browser extension for Chrome and Firefox (Manifest V3, built with [WXT](https://wxt.dev)) |
| [`apps/site`](apps/site) | humantxt.org (Astro), deployed on Vercel |

## Development

You need Node 22.12 or newer. The repo includes an `.nvmrc`.

```bash
nvm use && npm install
```

Run the website at http://localhost:4321:

```bash
npm run dev
```

Run the extension with live reload. This opens a Chrome window with the extension loaded:

```bash
npm run ext:dev
```

Run the tests: unit tests for the parser and IDs, then end-to-end tests of the real extension against the demo page:

```bash
npm test
```

```bash
npm run test:e2e
```

The first `test:e2e` run needs Playwright's browser:

```bash
npx playwright install chromium
```

### Install the extension

The extension isn't in the browser stores yet. To try it, load it unpacked:

```bash
npm run ext:build
```

- **Chrome:** open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked**, and choose `packages/extension/.output/chrome-mv3`.
- **Firefox (128+):** run `npm run build:firefox -w @humantxt/extension`. Then open `about:debugging#/runtime/this-firefox`, click **Load Temporary Add-on**, and choose `packages/extension/.output/firefox-mv3/manifest.json`.

Then open [humantxt.org/demo](https://humantxt.org/demo) and click **Share my commerce layer**.

## For websites

```js
if (navigator.humanTxt) {
  const me = await navigator.humanTxt.request({
    layers: ["commerce"],
    purpose: "Decide how often we email you.",
  });
  me.id;                          // "ht1_…" for this site only
  me.layers.commerce["Contact"];  // "email"
}
```

If the person declines, `request` rejects with an error named `HumanTxtDenied`. See [spec §6](spec/human-txt-v0.1.md#6-sharing-through-a-user-agent).

## Status

v0.1 is an early draft, built to get the idea in front of people. Planned next: passphrase-encrypted storage and sync, signed payloads and receipts, an agent-to-agent protocol, and store listings for the extension. See [CONTRIBUTING.md](CONTRIBUTING.md) to help.

## License

Code is under the [MIT License](LICENSE). The specification is under [CC BY 4.0](spec/LICENSE).
