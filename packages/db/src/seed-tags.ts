import { notInArray, sql } from "drizzle-orm";
import { tagCatalog } from "@evb/domain";
import type { Database } from "./client.ts";
import { tags } from "./app-schema.ts";

/** Inserts the catalog and refreshes label and category. A second run does not add rows. */
export async function seedTags(db: Database): Promise<void> {
  const slugs = tagCatalog.map((tag) => tag.slug);

  await db.transaction(async (tx) => {
    await tx
      .insert(tags)
      .values(
        tagCatalog.map((tag) => ({
          slug: tag.slug,
          label: tag.label,
          category: tag.category,
        })),
      )
      .onConflictDoUpdate({
        target: tags.slug,
        set: {
          label: sql`excluded.label`,
          category: sql`excluded.category`,
        },
      });

    await tx.delete(tags).where(notInArray(tags.slug, slugs));
  });
}
