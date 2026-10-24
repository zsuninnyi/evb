# EVB

EVB is a web app and a matching mobile app that suggest outfits for the current day from the weather. People sign in with Google, save photos of outfits with weather tags, occasion tags, and a 1–5 heart rating, then open the app and see the outfits that fit today.

This repository currently holds the product specification and the implementation plan. Application code is not in the repo yet. Build it by following [docs/implementation-plan.md](docs/implementation-plan.md) in order.

## Docs

| Doc | What it decides |
| --- | --- |
| [docs/product.md](docs/product.md) | Who the app is for, what v1 does, and how each screen behaves |
| [docs/architecture.md](docs/architecture.md) | Stack, module boundaries, data model, upload, moderation, and the later AWS shape |
| [docs/implementation-plan.md](docs/implementation-plan.md) | Ordered build steps and the exit criteria for each step |

## Agents

Coding agents should start at [AGENTS.md](AGENTS.md). [CLAUDE.md](CLAUDE.md), [.github/copilot-instructions.md](.github/copilot-instructions.md), and [.cursor/rules/](.cursor/rules/) point back to that file and to the docs above.

## v1 stack

TypeScript monorepo (pnpm, Turborepo):

- Web: Next.js, React, Tailwind
- Mobile: Expo, React Native, Expo Router, NativeWind
- API: Hono
- Worker: separate Node process for image derivatives and moderation
- Data: PostgreSQL and Drizzle
- Shared rules: `packages/domain` and `packages/contracts`
- Files: an object-storage interface, local disk or MinIO in development, S3 when deploying

AWS is a deployment target after the app works locally. It is not required to build or run v1 on a laptop.
