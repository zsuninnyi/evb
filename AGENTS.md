# EVB agent guide

EVB is a weather-based outfit app: a Next.js web client and an Expo mobile client over one API. The step 1 skeleton is in place. Implement only the current step in [docs/implementation-plan.md](docs/implementation-plan.md).

## Read before changing the repo

1. [docs/product.md](docs/product.md) for behavior.
2. [docs/architecture.md](docs/architecture.md) for boundaries, data, upload, and moderation.
3. [docs/implementation-plan.md](docs/implementation-plan.md) for the step you are on.

If a requested change conflicts with those docs, stop and ask. Do not silently widen v1.

## Product invariants

- Google is the only sign-in method. Every app screen and API route requires a session, except the auth endpoints and the health check.
- An outfit has one photo, a heart rating from 1 to 5, one or more weather tags, and one or more occasion tags.
- Tags come from the catalog in `packages/domain`. Users do not invent tags in v1.
- Heart rating is the owner's taste. It is not a community like count.
- Today shows the signed-in user's ready outfits that match today's derived weather tags, best matches first.
- Discover shows other people's outfits only when `visibility = public` and `status = ready`.
- The owner can always see their own outfits and the status of each one.
- Upload returns quickly. Byte transfer, image processing, and moderation continue afterward. The UI keeps a visible status until the outfit reaches a terminal state.
- Only the worker (or the admin review action) may move an outfit to `ready`, `pending_review`, or `rejected`.
- Clients send upload progress and the intended visibility. They do not send the moderation decision.

## Stack you must keep

| Concern | Choice |
| --- | --- |
| Language | TypeScript, strict |
| Repo | pnpm workspaces, Turborepo |
| Web | Next.js App Router, React, Tailwind |
| Mobile | Expo, Expo Router, NativeWind |
| API | Hono in `apps/api` |
| Worker | `apps/worker` |
| Database | PostgreSQL, Drizzle, SQL migrations |
| Validation | Zod in `packages/contracts` |
| Domain rules | Pure TypeScript in `packages/domain` |
| Auth | Better Auth, Google provider, sessions in Postgres |
| Objects | `packages/storage` interface; local/MinIO, then S3 |
| Weather | `WeatherProvider` interface; Open-Meteo in development |

Do not add a second backend, ORM, auth library, or styling system. Do not put database access in the clients. Do not call Rekognition, S3, or a weather vendor from React components.

## Target layout

```
apps/web          Next.js UI
apps/mobile       Expo UI
apps/api          Hono HTTP API and Better Auth
apps/worker       derivatives, moderation, stale-upload sweep
packages/domain   tag catalog, weather mapping, ranking, status machine
packages/contracts Zod schemas and shared DTO types
packages/db       Drizzle schema, client, migrations, seed
packages/storage  object storage drivers
```

`packages/domain` imports nothing from React, React Native, Hono, Drizzle, or AWS. `packages/contracts` imports Zod and domain types only.

## Status and matching

Outfit status values:

`uploading` → `processing` → `ready` | `pending_review` | `rejected`

`uploading` can also become `upload_failed`. `upload_failed` can return to `uploading` on retry. `rejected` is terminal for that photo.

Today's weather tags are derived in `packages/domain` from temperature, precipitation, snow, wind, and humidity. The thresholds live in that package and nowhere else. Ranking is: more matching weather tags, then higher heart rating, then newer outfit.

Library and Discover filters use OR inside a tag category and AND across categories. Heart rating filter is a minimum. Documented examples are in the product doc.

## Upload rules

- Create the outfit row first, then upload bytes to a presigned or local upload URL.
- Show the outfit immediately with a local preview and a status chip.
- Keep an upload tray mounted above individual screens so status stays visible after navigation.
- On reload, reconcile with the server. If the server still says `uploading` and no transfer is active, show Retry.
- A sweep marks `uploading` rows older than 15 minutes as `upload_failed`.

## How to work a step

1. Read the step's goal, scope, and exit criteria.
2. Stay inside the packages that step names.
3. Add tests the step asks for. Domain rules get unit tests. API behavior gets integration tests against Postgres.
4. Stop when the exit criteria pass. Do not start the next step in the same change unless the user asks.

When a web screen ships, keep the mobile screen list in the product doc achievable without an API change. Mobile parity is its own step; do not block web steps on native UI, and do not design web-only endpoints.

## Auth in tests

Production auth is Google only. Integration tests may use a test login that exists only when `NODE_ENV=test`. Never enable that route in development or production configs.

## Local development shape

Docker Compose runs PostgreSQL and MinIO. `pnpm dev` runs the API, worker, and web app. The mobile app runs through Expo. AWS accounts, Rekognition, RDS, and ECS belong to the last plan step.

Commercial weather data needs a licensed provider in production. Open-Meteo is the development provider. Keep vendor code behind `WeatherProvider`.

## Out of scope unless the plan changes

Multiple photos per outfit, photo replace, social follows, comments, community likes, push notifications, hourly forecast, user-created tags, anonymous browsing, and a custom design system beyond Tailwind and NativeWind.

## Keeping agent files aligned

[AGENTS.md](AGENTS.md) is the source of truth for agent behavior. [CLAUDE.md](CLAUDE.md), [.github/copilot-instructions.md](.github/copilot-instructions.md), and [.cursor/rules/](.cursor/rules/) should stay short and point here. When product rules change, update the docs first, then adjust these files only if an invariant changed.
