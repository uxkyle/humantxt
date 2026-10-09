# Contributing to human.txt

Thanks for helping. human.txt is an early draft, so the most valuable contributions right now are about **the idea itself**: the format, the vocabulary, and how sites and AI agents should honour it. Code contributions are welcome too.

## Ways to help

- **Spec and vocabulary.** Open an issue proposing a key, a layer name, or a change to the rules in [`spec/human-txt-v0.1.md`](spec/human-txt-v0.1.md). Explain the real-world situation it covers and who would honour it.
- **Implementations.** Libraries for reading human.txt in other languages, server middleware, or adapters for AI agent frameworks.
- **The extension.** Bugs, accessibility, and the planned features: encrypted storage, sync and signed receipts.
- **Privacy and legal review.** Help us find where human.txt lines up with existing law (GPC, GDPR, CCPA, the EU AI Act) and where it overpromises.

## Making a change

1. Fork the repo, and create a branch off `main`.
2. Run `nvm use && npm install`.
3. Make your change. If it touches the format, update all three of these together:
   - the spec,
   - `packages/core/src/vocabulary.ts`,
   - the tests in `packages/core/test`.
4. Run `npm test`, `npm run typecheck` and `npm run test:e2e`.
5. Open a pull request. Vercel posts a preview link for site changes.

## Principles

- **The person comes first.** When a choice trades a site's convenience against a person's control or privacy, pick the person.
- **Readable by humans.** A person should be able to open their file and understand it without documentation.
- **No global identifiers.** Nothing should let two sites link the same person.
- **Honest about limits.** human.txt states preferences. Don't describe it as enforcement or protection it can't provide.
