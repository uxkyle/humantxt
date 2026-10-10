---
title: human.txt v0.1
status: Draft
updated: "2026-10-09"
license: CC BY 4.0
---

# human.txt v0.1

**Status:** Draft. Expect breaking changes before 1.0. Discuss changes at [github.com/uxkyle/humantxt](https://github.com/uxkyle/humantxt).

The key words MUST, MUST NOT, SHOULD, SHOULD NOT and MAY are used as described in RFC 2119.

## 1. Purpose

robots.txt lets a website tell crawlers what they may do. human.txt goes the other way: it lets a **person** tell websites, apps and AI agents (together, **entities**) what they may do with that person's data and how that person wants to be treated.

A human.txt file belongs to the person. It lives on their device, in a **user agent** such as the humantxt browser extension. The user agent shares only the parts the person approves, and only with entities that ask.

human.txt is a statement of preferences. It does not enforce anything by itself. Its value comes from entities choosing to honour it, from laws that already give such signals weight, and from AI agents reading it before they act.

## 2. Terms

- **Person:** the human the file describes.
- **Entity:** any website, app, service or AI agent the person interacts with.
- **User agent:** software that holds the file and shares it for the person, such as a browser extension, an app, or an AI assistant.
- **Layer:** a named section of the file aimed at one kind of entity.
- **Grant:** a person's approval for one origin to read specific layers.

## 3. File format

human.txt is UTF-8 plain text. Each line is one of the following:

| Line | Example | Meaning |
|---|---|---|
| Blank | | Ignored. |
| Comment | `# anything` | Ignored. A `#` starts a comment only at the beginning of a line. |
| Layer | `[commerce]` | Starts a layer. |
| Entry | `Tracking: disallow` | Sets a key to a value. |

Grammar (ABNF-style):

```
file    = *(line EOL)
line    = blank / comment / layer / entry
comment = *WSP "#" *VCHAR-OR-WSP
layer   = "[" *WSP layer-name *WSP "]"
layer-name = "*" / (ALNUM *(ALNUM / "-"))      ; lowercase
entry   = key *WSP ":" *WSP value
key     = ALPHA *(ALPHA / DIGIT / "-")
value   = *VCHAR-OR-WSP                          ; trimmed
```

Rules:

1. Keys are case-insensitive. Writers SHOULD use the canonical spelling in §5.
2. Layer names are case-insensitive and are normalised to lowercase.
3. Entries before the first layer form the **header**. The header MUST contain `Version`.
4. A key MUST NOT appear twice in the same layer, and a layer MUST NOT appear twice in a file.
5. List values are separated by commas or semicolons.
6. Readers MUST ignore keys they don't recognise. Readers SHOULD report syntax errors and continue with the next line.
7. Keys beginning with `X-` are private extensions. They are never validated.

### Example

```
# human.txt
Version: 0.1
Updated: 2026-10-09

[*]
Language: en-US
Tracking: disallow
Data-Sale: disallow
AI-Training: disallow
AI-Summarize: allow
Contact: none

[commerce]
Applies-To: storefronts, marketplaces
Personalization: allow
Retention: 90d
Contact: email
Contact-Frequency: weekly

[ai-agents]
Applies-To: assistants, chatbots, support bots
Disclose-AI: required
Human-Escalation: required
Memory: session-only
Act-On-My-Behalf: ask-first
Tone: direct, concise
```

## 4. Layers

The `[*]` layer is the **base layer**. Every other layer inherits from it: the **effective** value of a key in layer `L` is the value set in `L` if it has one, and the value in `[*]` otherwise.

Layer names are chosen by the person. v0.1 suggests these names so that entities can ask for them consistently:

| Layer | For |
|---|---|
| `*` | Everyone |
| `commerce` | Storefronts, marketplaces, ads |
| `media` | News, video, social and publishing |
| `ai-agents` | Assistants, chatbots, autonomous agents |
| `work` | Employers, workplace and productivity tools |
| `health` | Health and wellbeing services |
| `finance` | Banks, payments, insurance |
| `government` | Public services |

When an entity asks for a layer the file doesn't define, the user agent returns the base layer under the requested name.

## 5. Core keys

### Header

| Key | Value | Meaning |
|---|---|---|
| `Version` | `0.1` | Spec version. Required. |
| `Updated` | `YYYY-MM-DD` | Last change. |

### General

| Key | Value | Meaning |
|---|---|---|
| `Applies-To` | free list | Note about who the layer is for. Informational. |
| `Language` | BCP 47 list | Preferred languages, most preferred first. |
| `Accessibility` | `reduced-motion`, `high-contrast`, `captions`, `screen-reader`, `plain-language`, `large-text` | Needs to honour. |

### Data use

| Key | Value | Meaning |
|---|---|---|
| `Tracking` | `allow` / `disallow` | Cross-site tracking, fingerprinting, third-party analytics. |
| `Data-Sale` | `allow` / `disallow` | Selling or renting personal data. |
| `Data-Share` | `allow` / `ask` / `disallow` | Sharing with partners for their own purposes. |
| `Personalization` | `allow` / `disallow` | Tailoring content or offers from behaviour on this site. |
| `Retention` | `none`, `session`, or `<n>d`/`<n>m`/`<n>y` | How long data may be kept. |

### Communication

| Key | Value | Meaning |
|---|---|---|
| `Contact` | `none`, or a list of `email`, `sms`, `push`, `phone`, `post`, `in-app` | Channels allowed for outreach. |
| `Contact-Frequency` | `never` / `as-needed` / `daily` / `weekly` / `monthly` | Maximum frequency of non-essential messages. |

### AI

| Key | Value | Meaning |
|---|---|---|
| `AI-Training` | `allow` / `disallow` | Training or fine-tuning models on my content or data. |
| `AI-Summarize` | `allow` / `disallow` | Summarising or quoting me in AI-generated answers. |
| `AI-Inference` | `allow` / `disallow` | Inferring sensitive traits (health, politics, finances, identity). |
| `Disclose-AI` | `required` / `preferred` / `no-preference` | Tell me when I'm talking to an AI. |
| `Human-Escalation` | `required` / `preferred` / `no-preference` | Let me reach a human instead. |
| `Memory` | `none` / `session-only` / `persistent` | What an AI may remember between conversations. |
| `Act-On-My-Behalf` | `never` / `ask-first` / `allow` | Whether an agent may take actions for me. |
| `Tone` | free text | How I like to be spoken to. |

An entity that receives a value it can't honour SHOULD treat it as the most protective option (`disallow`, `never`, `none`, `required`).

## 6. Sharing through a user agent

### 6.1 Announcement

A user agent MAY add this header to HTTP requests:

```
Human-Txt: v=0.1
```

The header only says that the visitor has a human.txt user agent. It MUST NOT carry an identifier, a URL or any preference values.

### 6.2 Requesting layers

A user agent in a browser exposes `navigator.humanTxt`:

```js
if (navigator.humanTxt) {
  const res = await navigator.humanTxt.request({
    layers: ["commerce"],
    purpose: "Tailor product suggestions and decide how often we email you.",
  });
  res.id;       // "ht1_…" pairwise ID for this site
  res.granted;  // ["commerce"]
  res.layers;   // { commerce: { "Data-Sale": "disallow", ... } }
  res.text;     // the same data as human.txt text
}
```

`request` resolves with:

| Field | Type | Meaning |
|---|---|---|
| `version` | string | Spec version. |
| `id` | string | Pairwise ID for the calling origin (§7). |
| `granted` | string[] | Requested layers the person approved. May be a subset. |
| `layers` | object | Each granted layer, merged with `[*]` (§4). |
| `text` | string | The same data as human.txt text. |

If the person declines, the promise rejects with an `Error` whose `name` is `HumanTxtDenied`.

### 6.3 Consent

1. The user agent MUST ask the person before sharing with an origin for the first time. The prompt MUST show the origin, the stated `purpose` and the requested layers, and MUST let the person approve each layer separately.
2. A grant applies to one origin only. Subdomains are separate origins.
3. Once an origin has a grant, the user agent MAY answer later requests for the same or fewer layers without asking again. A request for any layer not yet granted MUST prompt again.
4. The person MUST be able to see and revoke grants at any time.
5. The base layer is shared only when the person grants it explicitly or as part of a merged layer.

## 7. Pairwise IDs

Each origin receives a different, stable identifier:

```
id = "ht1_" || base32_lower( HMAC-SHA256(device_secret, origin)[0..16] )
```

- `device_secret` is 32 random bytes generated by the user agent. It MUST NOT leave the device.
- `origin` is the ASCII serialisation of the requesting origin, such as `https://storefront.example`.
- The output is truncated to 128 bits and encoded as lowercase RFC 4648 base32 without padding.

An entity can recognise a returning person. Two entities cannot compare IDs to find out they share a visitor. User agents MUST NOT expose a single global identifier.

## 8. Publishing a public base layer

A person MAY publish a public version of their file for agents and services that can't talk to a user agent:

```
https://<domain-the-person-controls>/.well-known/human.txt
```

- A published file SHOULD contain only the header and the `[*]` layer.
- It MUST be served as `text/plain; charset=utf-8`.
- It contains no identifier. Anyone can read it.
- A user agent MUST NOT reveal this URL through the announcement header.

## 9. Security and privacy considerations

- **Fingerprinting.** The presence of the `Human-Txt` header and the `navigator.humanTxt` object adds a small amount of fingerprinting surface. The header carries no other data, so this is about one bit.
- **Shared data is readable.** A granted layer is sent in plain text so the entity can act on it. People should share the narrowest layer that does the job.
- **Spoofed prompts.** Only the user agent's own interface may display consent prompts. Pages cannot draw them.
- **No enforcement.** v0.1 relies on entities honouring the file. Future versions will look at signed receipts so a person can prove what an entity was told.
- **Device secret.** If the device secret is lost, every pairwise ID changes. If it leaks, an attacker can compute the person's ID for any origin. User agents should store it with the platform's strongest local protection.

## 10. Planned for later versions

- Passphrase-encrypted storage and syncing across devices.
- Ed25519 signatures on shared payloads, and receipts.
- An agent-to-agent protocol for AI assistants acting for the person.
- A machine-readable vocabulary registry for community-defined keys.
