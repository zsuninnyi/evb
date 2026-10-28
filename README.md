# EVB

EVB is a web app and a matching mobile app that suggest outfits for the current day from the weather. People sign in with Google, save photos of outfits with weather tags, occasion tags, and a 1–5 heart rating, then open the app and see the outfits that fit today.

Step 1 of the implementation plan is in the repo: the monorepo, placeholder clients, and an API health check. Build the product by following [docs/implementation-plan.md](docs/implementation-plan.md) from step 2.

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

## Run locally

Start Docker, then:

```bash
docker compose up -d
pnpm install
pnpm dev
```

`pnpm dev` starts the API on port 3001, the worker, and the website on port 3000. The health check is [http://localhost:3001/health](http://localhost:3001/health). Postgres is published on port 5433, and MinIO on port 9000.

The mobile app starts separately:

```bash
pnpm --filter @evb/mobile dev
```
