# Product

## What EVB is

EVB helps someone decide what to wear today. They keep photos of outfits they already own, tag each outfit with the weather it suits and the occasion it suits, and say how much they like it on a 1–5 heart scale. When they open the app, they see the date, the weather where they are, and their outfits that fit that weather, with the ones they like most shown first.

The same product exists as a website and as a mobile app. Both talk to the same API and follow this document. A person who learns one client should recognize the other: same accounts, same outfits, same tags, same status, same screens.

## Who it is for

A signed-in person managing their own wardrobe, and optionally browsing outfits other people have marked public.

There is no anonymous use. There is no follow graph, comments, or likes from other people in v1. The heart rating is always the owner's rating.

## Core loop

1. Sign in with Google.
2. Allow location, or set a city if location is unavailable.
3. Add an outfit: one photo, weather tags, occasion tags, hearts, and private or public.
4. Leave the upload running. The app shows progress and later shows whether the photo is ready, in review, or rejected.
5. Open Today and see the current day, the weather, the tags derived from that weather, and the matching outfits from the user's own ready wardrobe.
6. Open Outfits to browse and filter everything they saved.
7. Open Discover to search other people's public, approved outfits with the same filters. Discover starts from today's weather tags.

## Screens

Both clients have these screens.

| Screen | Purpose |
| --- | --- |
| Sign in | Google sign-in, and a short explanation of the app |
| Today | Current local date, place, weather, derived tags, optional occasion narrow, ranked own outfits |
| Outfits | The owner's full library, with filters |
| Add outfit | Photo, tags, hearts, visibility, then a return to the library while upload continues |
| Outfit detail | Photo, tags, hearts, visibility, status, delete |
| Discover | Public ready outfits, same filters as the library, defaulted to today's weather tags |
| Location | Confirm or change the city used for weather |
| Admin review | Web only. Allowlisted emails approve or reject outfits in `pending_review` |

Primary navigation is Today, Outfits, Discover, and Add. Location and account actions live with the account menu. Admin review is not in the main navigation; it is a URL for allowlisted users.

## Account

- Sign-in is Google OAuth only.
- The app stores a display name and avatar from Google, plus the Google subject id and email.
- Other people can see the display name on a public outfit. They cannot see the email.
- Sign-out clears the session on that client.

## Outfits

An outfit is one wearable look.

| Field | Rule |
| --- | --- |
| Photo | Exactly one. JPEG, PNG, or WebP. Maximum 10 MB |
| Heart rating | Required integer, 1 through 5 |
| Weather tags | At least one, from the catalog |
| Occasion tags | At least one, from the catalog |
| Visibility | `private` or `public`. Default `private` |
| Title | Optional, max 80 characters |

The owner can edit title, tags, hearts, and visibility without uploading again. Editing tags or hearts changes Today and the library immediately for outfits that are already `ready`.

Setting visibility to `public` records intent. The outfit appears in Discover only after status is `ready`. While status is `uploading`, `processing`, or `pending_review`, the detail screen says that a public outfit goes live after review.

Delete removes the outfit for the owner and removes it from Discover. Stored objects are deleted by the worker.

v1 does not replace a photo in place and does not attach a second photo. To change the picture, the owner deletes the outfit and adds it again.

## Tag catalog

Users pick tags. They do not create them. The catalog in `packages/domain` is the only list, and the database is seeded from it.

### Weather

| Slug | Label | Meaning for the wearer |
| --- | --- | --- |
| `hot` | Hot | Very warm, light clothing |
| `warm` | Warm | Warm, no coat |
| `mild` | Mild | Light layer |
| `cool` | Cool | Jacket weather |
| `cold` | Cold | Coat weather |
| `rainy` | Rainy | Needs rain protection |
| `snowy` | Snowy | Snow on the ground or falling |
| `windy` | Windy | Wind is strong enough to change what to wear |
| `humid` | Humid | Hot or warm and sticky |
| `any` | Any weather | Fine to wear whatever the weather is |

### Occasion

| Slug | Label |
| --- | --- |
| `casual` | Casual |
| `smart` | Smart |
| `elegant` | Elegant |
| `sporty` | Sporty |
| `work` | Work |
| `formal` | Formal |
| `outdoor` | Outdoor |
| `party` | Party |
| `lounge` | Lounge |

An outfit may carry several weather tags and several occasion tags. A coat can be `cold` and `rainy`. A blazer can be `smart` and `work`.

## How today is chosen

"Today" is the user's local calendar date. Weather is the current conditions at the saved location, not an hourly forecast and not a weekly outlook.

The domain package derives zero or more weather tags from the observation:

| Signal | Tag |
| --- | --- |
| Temperature at or above 28°C | `hot` |
| 22–27°C | `warm` |
| 14–21°C | `mild` |
| 5–13°C | `cool` |
| Below 5°C | `cold` |
| Precipitation, or a rain weather code | `rainy` |
| A snow weather code | `snowy` |
| Wind at or above 40 km/h | `windy` |
| Humidity at or above 75% and temperature at or above 22°C | `humid` |

Temperature contributes one tag. Rain, snow, wind, and humidity can add more. A rainy cold day is `cold` and `rainy`.

If location permission is denied or lookup fails, Today asks for a city and saves it. The user can change that city later.

### Which outfits appear

Today lists the signed-in user's outfits where:

- status is `ready`
- at least one weather tag overlaps the derived tags, or the outfit is tagged `any`

`any` is a choice on the outfit, not a tag the weather observation produces. It does not increase the match count, so an outfit tagged for today's actual conditions ranks ahead of an any-weather outfit.

Occasion tags do not affect the default list. The screen offers the occasion catalog as an optional single-select narrow ("Work", "Sporty", and so on). Choosing one keeps only outfits that include that occasion tag.

### Order

1. More overlapping weather tags first.
2. Higher heart rating first.
3. Newer `createdAt` first.

Example: today is `cold` + `rainy`. An outfit tagged `cold` and `rainy` with 3 hearts ranks above an outfit tagged only `cold` with 5 hearts.

### Empty and partial states

- No location yet: ask for location or a city. Do not show a fake forecast.
- Weather request failed: say that weather is unavailable and offer retry. Keep the last successful location visible.
- Weather loaded, no overlapping outfits: name the derived tags and link to Add outfit.
- Uploads still in flight: Today stays focused on ready matches. In-progress outfits appear in the upload tray and in Outfits, with their status.

Discover is a separate screen. Today does not mix in other people's outfits.

## Outfits list

The list shows every outfit the owner has, including ones that are still uploading, processing, in review, failed, or rejected.

Filters combine like this:

- Selected weather tags: outfit matches if it has any of them, or if it is tagged `any`.
- Selected occasion tags: outfit matches if it has any of them.
- Weather filter and occasion filter both apply when both are set.
- Minimum hearts: rating is at least that value.
- Visibility: all, private, or public.
- Status: all, or one status.

Example: weather `hot` or `rainy`, occasion `smart` or `work`, hearts at least 4. An outfit must have (`hot` or `rainy`) and (`smart` or `work`) and hearts ≥ 4.

Sort is newest first, or highest hearts first. Default is newest first.

Each card shows the preview or processed image, hearts, tags, visibility, and a status chip whenever status is not `ready`.

## Discover

Discover uses the same filter semantics as the library and the same sort options.

The default filter is the weather tags derived for today. The user can clear or change them.

A row is included only when `visibility` is `public` and `status` is `ready`. Cards show the photo, tags, the owner's hearts, and the owner's display name. The owner's own public outfits may appear here too, so the owner can see what others see.

Private outfits, in-review outfits, rejected outfits, and uploads still in progress never appear here, even if the owner already chose public.

## Upload, as the user experiences it

Adding an outfit should take a short form submit. The user should not wait on the photo transfer, thumbnail generation, or moderation.

After submit:

1. The new outfit appears at once in Outfits, using a local preview.
2. A progress bar shows byte upload from 0 to 100 percent.
3. An upload tray stays on screen across Today, Outfits, Discover, and detail. It lists every outfit that is not in a terminal state.
4. When bytes are finished, the chip changes from uploading to processing.
5. The chip then becomes Ready, In review, Rejected, or Upload failed.

The user can navigate, edit other outfits, or add another outfit while this runs.

If the app is reloaded mid-upload, the percent progress is gone. The outfit remains, the chip says the upload was interrupted, and Retry sends the same photo bytes again without asking for tags again. If the user has lost the local file, Retry asks them to pick the photo again and keeps the same outfit id.

Rejected outfits explain that the photo cannot be used. The stored image is removed. The owner can delete the row.

In-review outfits stay visible to the owner and stay out of Discover until an admin approves or rejects them.

## Moderation, as the user experiences it

Every photo is moderated, including private ones, before it can become `ready`.

- Allowed photos become ready. Public intent then means they show up in Discover.
- Uncertain photos stay visible to the owner as in review and stay out of Discover.
- Blocked photos are rejected and the files are deleted.

The user sees a short status, not vendor label dumps.

Admin review, on the web, lists `pending_review` outfits for allowlisted emails and lets that person approve or reject. Approve sets `ready`. Reject sets `rejected` and deletes the files.

## Privacy

v1 includes sign-out and outfit delete. Full account deletion can follow the same storage and database cleanup later; it is not required to finish the first build steps. Do not add analytics, ad pixels, or a public unauthenticated gallery.

## v1 does not include

- More than one photo on an outfit, or replacing a photo in place
- Creating custom tags
- Likes, comments, follows, shares, or messaging
- Push notifications
- Forecasts beyond current conditions
- Styling recommendations generated by a model
- Wear history
- Anonymous Discover
- Native admin UI
