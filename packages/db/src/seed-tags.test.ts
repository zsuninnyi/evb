import assert from "node:assert/strict";
import { after, describe, it } from "node:test";
import { tagCatalog } from "@evb/domain";
import { closeDb, createDb } from "./client.ts";
import { seedTags } from "./seed-tags.ts";
import { tags } from "./schema.ts";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to test the tag seed");
}

const db = createDb(databaseUrl);

after(async () => {
  await closeDb(db);
});

describe("seedTags", () => {
  it("leaves each catalog slug once after two runs", async () => {
    await seedTags(db);
    await seedTags(db);

    const rows = await db.select({ slug: tags.slug }).from(tags);
    const slugs = rows.map((row) => row.slug).sort();
    const expected = tagCatalog.map((tag) => tag.slug).sort();

    assert.deepEqual(slugs, expected);
  });
});
