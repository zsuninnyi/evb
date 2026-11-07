import { closeDb, createDb } from "./client.ts";
import { seedTags } from "./seed-tags.ts";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const db = createDb(databaseUrl);

try {
  await seedTags(db);
} finally {
  await closeDb(db);
}
