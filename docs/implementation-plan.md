# Implementation plan

EVB is specified in [product.md](product.md) and [architecture.md](architecture.md). This file is the build order. Do one step at a time. Each step has a goal, the work, and exit criteria. Stop when the exit criteria pass.

Step 1 is complete. The next step is step 2.

Do not deploy to AWS, add Rekognition, or build the mobile UI before their steps. Do keep the API client-agnostic from the first outfit endpoint so the mobile app is not a second backend.

## Milestones

| Step | Outcome |
| --- | --- |
| 1 | Monorepo boots: Postgres, MinIO, API, worker, web |
| 2 | Domain rules and database schema, with tests |
| 3 | Google sign-in on the web |
| 4 | Outfit metadata, library filters, on the API and the web |
| 5 | Async upload, progress, and the status tray |
| 6 | Worker processing and status polling |
| 7 | Today: location, weather, ranked outfits |
| 8 | Moderation decisions, Discover, admin review |
| 9 | Expo app reaches screen parity |
| 10 | AWS drivers and a deployable topology |

## Step 1 — Repository skeleton

**Goal:** A developer can install, start dependencies, and run empty apps.

**Work:**

- Add pnpm workspaces and Turborepo.
- Add a shared TypeScript config with `strict` on.
- Add ESLint and Prettier once, at the root.
- Create the package folders from the architecture doc with `package.json` names `@evb/domain`, `@evb/contracts`, `@evb/db`, `@evb/storage`, and apps `web`, `mobile`, `api`, `worker`.
- `apps/api` exposes `GET /health`.
- `apps/worker` logs that it is idle and exits cleanly on SIGTERM.
- `apps/web` renders a placeholder home page with Tailwind.
- `apps/mobile` renders a placeholder home screen with Expo Router. Do not build the real screens yet.
- Add `docker-compose.yml` for PostgreSQL and MinIO, plus a `.env.example` covering the variables in the architecture doc.
- Add root scripts: `dev`, `typecheck`, `lint`, `test`.

**Exit criteria:**

- `pnpm install` and `pnpm typecheck` succeed.
- Compose brings up Postgres and MinIO.
- API health returns 200.
- Web and Expo placeholders render.
- No product features are implemented in this step.

## Step 2 — Domain and schema

**Goal:** Tag catalog, weather derivation, ranking, filters, and the status machine exist as tested pure code. Postgres matches that model.

**Work:**

- Implement the exports listed in the architecture doc inside `packages/domain`.
- Unit-test temperature bands, combined tags (cold + rainy, hot + humid), ranking order, filter OR/AND semantics, minimum hearts, and every legal and illegal status transition.
- Add Drizzle schema for Better Auth tables, `user_settings`, `tags`, `outfits`, `outfit_tags`, `moderation_results`, and `jobs`.
- Generate a SQL migration.
- Seed tags from `tagCatalog` in an idempotent script.
- Add `ObjectStorage` with a local filesystem driver and a MinIO/S3 driver. Methods: `createUploadUrl`, `createReadUrl`, `putObject`, `deleteObject`. No outfit code calls a vendor SDK directly.

**Exit criteria:**

- Domain unit tests pass.
- Migration applies to the Compose Postgres.
- Running the seed twice leaves exactly the catalog slugs, once each.
- A small script or test can put and read an object via the local driver.

## Step 3 — Google auth on the web

**Goal:** A person can sign in with Google and hit a protected API.

**Work:**

- Mount Better Auth on the API with the Google provider and the Drizzle adapter.
- Proxy `/api` from Next.js to the API.
- Add a web sign-in screen and a sign-out action.
- Require a session for every later route. `/health` and Better Auth routes stay public.
- Add `POST /test/login` behind `NODE_ENV=test`.
- Store the session in an httpOnly cookie for the web app.
- Document the Google Cloud setup in `docs/google-oauth.md`: consent screen, web client, redirect URL, and a note that iOS and Android client ids arrive in step 9. Do not commit secrets.

**Exit criteria:**

- Unauthenticated `GET /outfits` returns 401.
- A developer can sign in with a real Google client configured in `.env`.
- The test login works in the test environment and is absent when `NODE_ENV=production`.
- Signed-in web UI shows the Google display name.

Manual Google credentials are required for the browser check. Automated tests use the test login.

## Step 4 — Outfit library

**Goal:** The owner can create outfit metadata, edit it, delete it, and filter the list. Photos are still a placeholder.

**Work:**

- Implement Zod schemas in `packages/contracts` for the outfit DTO, the list query, and patch. Leave `POST /outfits` for step 5 so create always starts an upload.
- Add a test and local-dev fixture helper that inserts outfits in `ready` with null image keys. The web card uses a neutral placeholder when no read URL exists.
- Implement `GET /outfits`, `GET /outfits/:id`, `PATCH /outfits/:id`, and `DELETE /outfits/:id`.
- Enforce at least one weather tag, at least one occasion tag, and hearts 1–5 on patch.
- List filters and sorts follow the product doc. Paginate with limit and cursor.
- Authorize by owner. One user cannot read another's private outfit.
- Web screens: Outfits and detail, including edit of title, tags, hearts, and visibility, plus delete. Cards show hearts, tags, visibility, and a status chip when status is not `ready`.
- Integration tests cover filter combinations, owner isolation, patch validation, and delete.

**Exit criteria:**

- Two test users cannot read each other's outfits.
- The documented filter example (`hot` or `rainy`, and `smart` or `work`, hearts ≥ 4) is an integration test.
- The web library can filter, edit, and delete seeded outfits.
- There is still no user-facing create button. Add outfit arrives with upload in step 5.

## Step 5 — Async upload and visible progress

**Goal:** Submit returns before the file transfer finishes, and the user always sees status.

**Work:**

- `POST /outfits` requires `contentType` and `byteSize`, validates the 10 MB and mime-type limits, stores `uploading`, and returns an upload URL for `{ownerId}/{outfitId}/original`.
- The web form accepts one image, submits metadata, then uploads bytes with progress events.
- Navigate to Outfits immediately after create. The new card uses a local object URL as the preview.
- Add the persistent upload tray for non-terminal outfits.
- `POST /outfits/:id/upload-complete` moves `uploading` to `processing` and inserts a `process` job.
- `POST /outfits/:id/retry-upload` works from `upload_failed`.
- If the page reloads during `uploading`, the card offers Retry.
- The worker's stale sweep marks `uploading` older than 15 minutes as `upload_failed`. Run the sweep on an interval inside `apps/worker`.

**Exit criteria:**

- Creating an outfit returns before a slow upload finishes. Test this with a small delay or a large file and assert the POST completed while bytes are still transferring.
- The tray and the card show percent during upload and `processing` after completion.
- A reload mid-upload shows Retry and does not create a second outfit.
- A row left in `uploading` past the deadline becomes `upload_failed`.
- The user can open Today navigation, even if Today is still a placeholder, without losing the tray.

## Step 6 — Worker processing

**Goal:** Finished uploads become viewable images and leave `processing`.

**Work:**

- The worker claims `process` jobs from Postgres with a lock so two loops do not process the same row.
- On claim, read the original, write a display image and a thumbnail with `sharp`, save keys, and call `ModerationProvider`.
- Ship the `allow` provider (always allowed) and a `test` provider that can force uncertain or blocked from a test hook or a header used only when `NODE_ENV=test`.
- Apply `transition` for the provider decision.
- On blocked, delete objects and set `rejected`.
- On allowed, set `ready` and return signed read URLs from the API.
- The web polls an in-progress outfit until a terminal status.
- Delete enqueues `delete_objects` and the worker removes keys.

**Exit criteria:**

- A normal upload ends as `ready` and the card shows the processed image.
- The test provider can produce `pending_review` and `rejected`.
- Rejected outfits have no readable object.
- Job claim does not run the same job twice in a concurrency test.
- Illegal transitions are not reachable from the HTTP API.

## Step 7 — Today and weather

**Goal:** The signed-in home screen is the current day, current weather, and ranked own outfits.

**Work:**

- Add `WeatherProvider` and an Open-Meteo implementation, plus city geocoding.
- `GET /today` derives tags only through `packages/domain`, loads the user's `ready` outfits, and ranks them there.
- Accept coordinates or a city. Persist `user_settings` when the user confirms a place.
- Web Today screen: local date, place, temperature, condition, derived tag chips, optional single occasion narrow, ranked grid, and the empty states from the product doc.
- Request browser geolocation. If it is denied, send the user through the location screen.
- Unit tests already cover derivation and ranking. Add an integration test that a cold+rainy day orders a two-tag outfit above a higher-hearted one-tag outfit.
- Cache the latest observation in memory on the API for a few minutes per rounded coordinate so browsing filters does not hammer the vendor. Correctness of tags still comes from the domain function.

**Exit criteria:**

- With a saved location, Today shows real current conditions from Open-Meteo in development.
- Outfit order matches the ranking rules.
- Occasion narrow changes the list.
- Denied location shows the city search, and the chosen city survives a reload.
- Failed weather shows an error and retry, without inventing tags.

## Step 8 — Public outfits and moderation

**Goal:** Public search shows only approved outfits, and uncertain photos can be reviewed.

**Work:**

- `GET /discover` with the library filters, forced to `public` and `ready`.
- Default the web Discover screen to today's derived weather tags, and let the user change filters.
- Cards show display name, hearts, and tags.
- Copy on detail explains that public outfits appear after review.
- Admin list and approve/reject on the web, gated by `ADMIN_EMAILS`.
- Admin reject deletes objects.
- Record a `moderation_results` row for automated and admin decisions.
- Keep vendor raw JSON out of normal outfit DTOs.
- Integration tests: a private outfit is absent from Discover; a public outfit in `pending_review` is absent; a public `ready` outfit is present; a non-admin receives 403 on review routes.

**Exit criteria:**

- The product rules for Discover hold in tests and in the web UI.
- An allowlisted user can clear the review queue.
- A non-allowlisted user cannot.
- The `allow` driver still lets a solo developer use Discover end to end without Rekognition.

## Step 9 — Mobile twin

**Goal:** The Expo app covers every shared screen in the product doc.

**Work:**

- Better Auth bearer session on React Native, with Google iOS and Android client ids.
- Screens: sign in, today, outfits, add, detail, discover, location.
- NativeWind for layout. Mirror the web information architecture, including the upload tray and status chips.
- Use an upload API that reports progress.
- Geolocation via Expo location, with the same city fallback.
- The admin screen stays web-only.
- Extract a tiny shared API helper if both clients would otherwise duplicate fetch and Zod parsing. Do not extract a shared visual component library.

**Exit criteria:**

- A developer can sign in on a simulator or device.
- They can add an outfit, watch progress, leave the screen, and see it become ready.
- Today and Discover match the web app against the same account.
- Filters, hearts, and visibility behave the same as on the web.
- Killing the app during upload yields `upload_failed` or Retry, and does not duplicate the outfit.

## Step 10 — AWS

**Goal:** The same code can run with S3, a queue, Rekognition, and managed Postgres.

**Work:**

- Confirm the S3 driver against a real bucket with public access blocked. Reads stay on signed URLs.
- Add the Rekognition moderation provider and the threshold mapping from the architecture doc.
- Move job delivery to SQS behind the existing claim path, or document a single-consumer worker on ECS if SQS is deferred. Prefer SQS if more than one worker will run.
- Add infrastructure definition (AWS CDK or SST) for RDS, S3, ECR, the API service, the worker service, SQS, Secrets Manager, and the Rekognition permission.
- Set `WEATHER_DRIVER` to a commercially usable provider before any public production launch.
- Run through upload, today, discover, and admin review in a staging account.

**Exit criteria:**

- Staging web (and mobile, if store builds are available) performs the core loop against AWS.
- A blocked Rekognition result never becomes readable in Discover.
- Secrets are not in the repo or the image.
- Local Compose flow from earlier steps still works with the local drivers.

## Suggested pull requests

One pull request per step. Keep step 9 as one PR only if the screens land together behind the finished API; otherwise split by screen after auth on device works.

## Manual setup checklist

- Google Cloud project with a web OAuth client (step 3) and mobile clients (step 9).
- `.env` from `.env.example`.
- Docker for Postgres and MinIO.
- An Open-Meteo call works from the developer's network (step 7).
- AWS account, bucket, and Rekognition access only at step 10.
- At least one email in `ADMIN_EMAILS` before trying the review queue.

## Risks to watch

| Risk | What to do |
| --- | --- |
| Google OAuth differs between web and Expo | Keep redirect and client-id notes in `docs/google-oauth.md` as soon as step 3 is done |
| Fashion photos flagged as suggestive | Map those to `pending_review`, and tune thresholds in step 10 with real uploads |
| Abandoned browser uploads | Stale sweep plus Retry; do not block the form on the PUT |
| Open-Meteo commercial terms | Keep the provider interface and switch it before production |
| Domain rules copied into React | Review imports. `apps/*` may depend on `@evb/domain`, and the domain package may not depend on `apps/*` |

## Definition of v1 done

Steps 1 through 9 meet their exit criteria. Step 10 is the production path and can follow the first usable local release. v1 behavior is the product doc: Google sign-in, one-photo outfits, catalog tags, hearts, async upload with visible status, Today from current weather, filtered library, and moderated public Discover.
