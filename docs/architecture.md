# Architecture

This is the technical shape of EVB. Behavior lives in [product.md](product.md). Build order lives in [implementation-plan.md](implementation-plan.md).

## Recommendation

Use one TypeScript monorepo with two clients and one HTTP API.

| Piece | Role |
| --- | --- |
| `apps/web` | Next.js App Router, React, Tailwind. Proxies `/api` to the Hono app so the browser session cookie stays first-party |
| `apps/mobile` | Expo, Expo Router, NativeWind. Same screens as the web app. Sends a Better Auth bearer token |
| `apps/api` | Hono. Auth, outfits, today, discover, presigned uploads |
| `apps/worker` | Image derivatives, moderation, deletion of objects, stale-upload sweep |
| `packages/domain` | Tag catalog, weather-tag derivation, ranking, outfit status machine |
| `packages/contracts` | Zod request and response schemas shared by API and clients |
| `packages/db` | Drizzle schema, migrations, seed |
| `packages/storage` | `ObjectStorage` with a local/MinIO driver and an S3 driver |

This split is the practical way to get a real website and a real React Native app without two backends. Expo Web as the only client would make Google redirect login, uploads, and the admin review page weaker. A Next.js-only app wrapped later in a webview would not be a native twin. Sharing `domain` and `contracts` is what keeps the twins identical where it matters: tags, ranking, validation, and status.

Postpone AWS until the app works locally. Design the seams now (`ObjectStorage`, `WeatherProvider`, `ModerationProvider`) so S3, a commercial weather API, and Rekognition replace development drivers without rewriting screens.

Production on AWS, when that step starts:

- API and worker as containers (ECS/Fargate or App Runner), because the worker uses `sharp` and a poll loop
- RDS PostgreSQL
- S3 for objects, with the bucket blocked from public access
- SQS between API and worker once more than one worker runs
- Rekognition `DetectModerationLabels` behind `ModerationProvider`
- Secrets Manager for the Google client secret, auth secret, and database URL
- CloudFront or signed GET URLs for display images

Lambda can emit S3 notifications onto SQS later. It should not be the only place that runs `sharp` or the status machine. Local and production should share the worker code.

## Runtime

```
Browser or Expo
  -> apps/api (session)
       -> PostgreSQL
       -> ObjectStorage (presigned put/get)
       -> WeatherProvider
  -> apps/worker
       -> PostgreSQL
       -> ObjectStorage
       -> ModerationProvider
       -> sharp
```

Clients never receive long-lived storage credentials. They receive a short-lived upload URL and short-lived read URLs.

## Domain package

Export at least:

- `tagCatalog` with the slugs, labels, and categories from the product doc
- `deriveWeatherTags(observation) -> TagSlug[]`
- `rankOutfits(outfits, activeWeatherTags) -> ranked outfits`
- `transition(status, event) -> status` that throws on illegal events
- filter helpers that implement OR-within-category and AND-across-categories, plus minimum hearts

`deriveWeatherTags` owns the temperature bands, 40 km/h wind threshold, humidity rule, and the mapping from WMO weather codes to rain or snow. API routes pass through the result. UI code displays it.

`transition` is the only legal way to change status:

| From | Event | To |
| --- | --- | --- |
| `uploading` | `upload_completed` | `processing` |
| `uploading` | `upload_failed` | `upload_failed` |
| `upload_failed` | `retry` | `uploading` |
| `processing` | `moderation_allowed` | `ready` |
| `processing` | `moderation_uncertain` | `pending_review` |
| `processing` | `moderation_blocked` | `rejected` |
| `pending_review` | `admin_approved` | `ready` |
| `pending_review` | `admin_rejected` | `rejected` |

`ready` and `rejected` have no outbound events in v1. Delete is a row removal, not a status.

## Data model

Ids are UUIDs. Timestamps are `timestamptz`.

### users

Better Auth owns its user, session, and account tables. Add columns or a `user_settings` table for:

- `latitude`, `longitude`, `locationLabel` (nullable until onboarding)
- `locationUpdatedAt`

Do not duplicate the Google profile into a second user table.

### tags

- `id`, `slug` unique, `label`, `category` (`weather` | `occasion`)

Seeded only from `tagCatalog`. Slugs are stable API values.

### outfits

- `id`
- `ownerId` → users
- `title` nullable
- `heartRating` smallint 1–5
- `visibility` `private` | `public`
- `status` as in the state machine
- `originalKey`, `displayKey`, `thumbnailKey` nullable object keys
- `contentType`, `byteSize`
- `createdAt`, `updatedAt`
- `uploadExpiresAt` used by the stale sweep

### outfit_tags

- (`outfitId`, `tagId`) primary key

### moderation_results

- `id`, `outfitId`, `provider` (`allow` | `rekognition` | `admin`)
- `decision` (`allowed` | `uncertain` | `blocked`)
- `raw` jsonb for vendor payload, not returned to normal clients
- `createdAt`

### jobs

A Postgres table is enough for v1 so local development needs no queue service:

- `id`, `outfitId`, `type` (`process` | `delete_objects`), `runAfter`, `attempts`, `lockedAt`, `lastError`

When SQS arrives, the worker's claim function is the only code that should change.

## API surface

All routes except Better Auth and `GET /health` require a session.

| Method | Path | Behavior |
| --- | --- | --- |
| POST | `/outfits` | Validate tags and hearts. Insert `uploading`. Return outfit plus upload instructions |
| POST | `/outfits/:id/upload-complete` | Owner only. If status is `uploading`, move to `processing` and enqueue `process` |
| POST | `/outfits/:id/retry-upload` | Owner only. From `upload_failed` to `uploading`, return new upload instructions |
| GET | `/outfits` | Owner's rows, filters and sort from the product doc |
| GET | `/outfits/:id` | Owner sees any status. Other users see it only when public and ready |
| PATCH | `/outfits/:id` | Owner edits title, tags, hearts, visibility |
| DELETE | `/outfits/:id` | Owner. Enqueue object deletion and delete the row |
| GET | `/today` | Query `lat`/`lon` optional. Persist location when provided. Return date, observation, derived tags, ranked ready outfits |
| GET | `/discover` | Public ready outfits, same filters |
| GET | `/admin/reviews` | Allowlisted email. `pending_review` queue |
| POST | `/admin/reviews/:id` | Body decision `approve` or `reject` |

Responses use Zod schemas from `packages/contracts`. Image fields are signed read URLs with a short TTL, plus the status. The original key never leaves the server.

List endpoints are paginated with `limit` and `cursor`.

## Upload flow

```
Client                API                 Storage              Worker
  |-- POST /outfits -->|                     |                    |
  |<- id, upload url --|                     |                    |
  |-- PUT bytes ---------------------------->|                    |
  |   progress in UI    |                    |                    |
  |-- upload-complete ->|                     |                    |
  |                     |-- enqueue process --------------------->|
  |                     |                     |                    |
  |-- GET outfit ------>|                     |<-- read original --|
  |<- status: processing|                     |-- write derivatives|
  |                     |                     |-- moderate --------|
  |                     |<----------- status ready | review | rejected
```

The create request checks content type and byte size and refuses anything over 10 MB or outside jpeg, png, and webp. The storage key is `{ownerId}/{outfitId}/original`. The API chooses the key. The client does not.

On `moderation_allowed`, the worker writes a display image and a thumbnail with `sharp`, stores their keys, and sets `ready`.

On `moderation_blocked` or admin reject, the worker deletes every key for that outfit and sets `rejected`.

On `moderation_uncertain`, it still writes derivatives so the owner can see the photo, and sets `pending_review`.

The development `ModerationProvider` is named `allow`. It marks every image allowed. A second test provider forces uncertain or blocked so the UI and admin queue can be exercised. Rekognition is a third provider, selected with `MODERATION_DRIVER=rekognition`.

Suggested Rekognition mapping, to be tuned with real fashion photos during the AWS step:

- High-confidence explicit nudity, sexual activity, violence, or visually disturbing content → `blocked`
- Lower-confidence suggestive content → `uncertain`
- Otherwise → `allowed`

Swimwear and normal clothing should land on `allowed` or `uncertain`, not `blocked`. Keep the mapping in the Rekognition provider, not in the route.

## Client status

Server status is authoritative. Byte progress is client-only.

- A small upload tracker in each client starts the PUT, reports percent, calls `upload-complete`, and retries.
- The tray reads the tracker plus any outfit whose status is `uploading`, `processing`, or `pending_review`.
- Poll `GET /outfits/:id` about every 3 seconds while a tracked outfit is `processing` or `pending_review`. Stop on `ready`, `rejected`, or `upload_failed`.
- After launch, `GET /outfits?status` reconciliation repairs the tray.

Web uploads use `XMLHttpRequest` or an equivalent that exposes progress. React Native uses an Expo upload API that exposes progress. A hard refresh or a killed app may abandon an in-flight PUT. The stale sweep (15 minutes) and the Retry action cover that case. v1 does not promise a background upload that survives process death.

## Weather

`WeatherProvider.getCurrent(lat, lon)` returns temperature Celsius, precipitation, wind speed km/h, humidity percent, and a WMO weather code.

Development implementation: Open-Meteo forecast endpoint for current conditions, and Open-Meteo geocoding for city search. Open-Meteo is appropriate for development. Production should switch the provider to a commercially licensed source, or a self-hosted Open-Meteo, before a public launch. Screens depend on the interface, not on the vendor JSON.

The web and mobile clients read the device location and send coordinates to `GET /today`. The API geocodes only when the user submits a city name.

## Authorization

- Session on every data route.
- Outfit mutations check `ownerId`.
- Discover queries are server-side `visibility = public AND status = ready`.
- Admin routes check the email against `ADMIN_EMAILS`.
- Signed URLs are generated per request for keys the viewer is allowed to see.
- `raw` moderation payloads are admin-only.

Integration tests may call `POST /test/login` only when `NODE_ENV=test`.

## Web and mobile parity

Routes mirror each other.

| Web | Mobile |
| --- | --- |
| `app/(app)/today` | `app/(app)/today` |
| `app/(app)/outfits` | `app/(app)/outfits` |
| `app/(app)/outfits/new` | `app/(app)/outfits/new` |
| `app/(app)/outfits/[id]` | `app/(app)/outfits/[id]` |
| `app/(app)/discover` | `app/(app)/discover` |
| `app/(app)/location` | `app/(app)/location` |
| `app/admin/reviews` | none |

Share types and fetch functions through a thin client helper that both apps can import. Keep components separate: Tailwind on the web, NativeWind on mobile. Do not introduce a third UI kit to force pixel-identical components.

## Configuration

| Variable | Use |
| --- | --- |
| `DATABASE_URL` | Postgres |
| `BETTER_AUTH_SECRET` | Session signing |
| `BETTER_AUTH_URL` | Public API origin |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Web OAuth |
| `GOOGLE_IOS_CLIENT_ID` / `GOOGLE_ANDROID_CLIENT_ID` | Mobile OAuth |
| `STORAGE_DRIVER` | `local` or `s3` |
| `S3_BUCKET`, `S3_REGION`, `S3_ENDPOINT`, credentials | MinIO or AWS |
| `MODERATION_DRIVER` | `allow`, `test`, or `rekognition` |
| `WEATHER_DRIVER` | `open-meteo` or a later vendor |
| `ADMIN_EMAILS` | Comma-separated allowlist |
| `NODE_ENV` | Enables test login only when `test` |

## Local dependencies

Docker Compose provides PostgreSQL and MinIO. The worker and API run on the host via Turborepo. No AWS account is required before the deployment step.
