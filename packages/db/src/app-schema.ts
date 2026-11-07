import { sql } from "drizzle-orm";
import {
  check,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { OUTFIT_STATUSES, TAG_CATEGORIES } from "@evb/domain";
import { user } from "./auth-schema.ts";

const timestamptz = (name: string) =>
  timestamp(name, { withTimezone: true, mode: "date" });

export const tagCategory = pgEnum("tag_category", TAG_CATEGORIES);

export const outfitStatus = pgEnum("outfit_status", OUTFIT_STATUSES);

export const outfitVisibility = pgEnum("outfit_visibility", [
  "private",
  "public",
]);

export const moderationProvider = pgEnum("moderation_provider", [
  "allow",
  "rekognition",
  "admin",
]);

export const moderationDecision = pgEnum("moderation_decision", [
  "allowed",
  "uncertain",
  "blocked",
]);

export const jobType = pgEnum("job_type", ["process", "delete_objects"]);

export const userSettings = pgTable("user_settings", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  locationLabel: text("location_label"),
  locationUpdatedAt: timestamptz("location_updated_at"),
});

export const tags = pgTable("tags", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  label: text("label").notNull(),
  category: tagCategory("category").notNull(),
});

export const outfits = pgTable(
  "outfits",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title"),
    heartRating: smallint("heart_rating").notNull(),
    visibility: outfitVisibility("visibility").notNull().default("private"),
    status: outfitStatus("status").notNull(),
    originalKey: text("original_key"),
    displayKey: text("display_key"),
    thumbnailKey: text("thumbnail_key"),
    contentType: text("content_type"),
    byteSize: integer("byte_size"),
    createdAt: timestamptz("created_at").defaultNow().notNull(),
    updatedAt: timestamptz("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    uploadExpiresAt: timestamptz("upload_expires_at"),
  },
  (table) => [
    check(
      "outfits_heart_rating_range",
      sql`${table.heartRating} between 1 and 5`,
    ),
    index("outfits_owner_id_idx").on(table.ownerId),
  ],
);

export const outfitTags = pgTable(
  "outfit_tags",
  {
    outfitId: uuid("outfit_id")
      .notNull()
      .references(() => outfits.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "restrict" }),
  },
  (table) => [primaryKey({ columns: [table.outfitId, table.tagId] })],
);

export const moderationResults = pgTable("moderation_results", {
  id: uuid("id").defaultRandom().primaryKey(),
  outfitId: uuid("outfit_id")
    .notNull()
    .references(() => outfits.id, { onDelete: "cascade" }),
  provider: moderationProvider("provider").notNull(),
  decision: moderationDecision("decision").notNull(),
  raw: jsonb("raw"),
  createdAt: timestamptz("created_at").defaultNow().notNull(),
});

export const jobs = pgTable(
  "jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    outfitId: uuid("outfit_id")
      .notNull()
      .references(() => outfits.id, { onDelete: "cascade" }),
    type: jobType("type").notNull(),
    runAfter: timestamptz("run_after").defaultNow().notNull(),
    attempts: integer("attempts").notNull().default(0),
    lockedAt: timestamptz("locked_at"),
    lastError: text("last_error"),
  },
  (table) => [index("jobs_run_after_idx").on(table.runAfter)],
);
