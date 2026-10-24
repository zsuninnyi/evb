# Copilot instructions

Follow [AGENTS.md](../AGENTS.md) and the docs it lists.

- This repo is the EVB specification until the implementation plan says to add an app.
- Use TypeScript strict, Zod contracts, and the domain package for weather matching, ranking, and outfit status transitions.
- Web UI is Next.js, React, and Tailwind. Mobile UI is Expo, React Native, and NativeWind. API is Hono. Data is PostgreSQL via Drizzle.
- Keep upload status visible in the client. Only the worker or an admin review action may mark an outfit ready, pending review, or rejected.
- Discover lists public outfits only after moderation has marked them ready.
