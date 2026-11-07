import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

/**
 * Shape used by `auth generate` so the Drizzle tables match Better Auth.
 * Step 3 mounts this on the API. It is not a running server in this package.
 */
export const auth = betterAuth({
  secret: "schema-generation-only-not-a-real-secret",
  baseURL: "http://localhost:3001",
  database: drizzleAdapter(
    {},
    {
      provider: "pg",
    },
  ),
  advanced: {
    database: {
      generateId: "uuid",
    },
  },
});
