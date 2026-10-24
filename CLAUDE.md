# Claude Code

Follow [AGENTS.md](AGENTS.md). It is the agent guide for this repository.

Before writing application code, read:

- [docs/product.md](docs/product.md)
- [docs/architecture.md](docs/architecture.md)
- [docs/implementation-plan.md](docs/implementation-plan.md)

Implement only the current step in the implementation plan. The app is specified and not built yet.

Invariants that must not drift:

- Google-only auth, session required.
- Domain rules stay in `packages/domain` with no framework imports.
- Clients never set moderation status.
- Public outfits appear in Discover only when `visibility = public` and `status = ready`.
- Upload is asynchronous, and the UI always shows outfit status.
