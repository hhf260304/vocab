// lib/db/schema.ts
import { sql } from "drizzle-orm";
import {
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  image: text("image"),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
});

export const categories = pgTable("categories", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
});

export const vocabulary = pgTable("vocabulary", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  categoryId: text("category_id").references(() => categories.id, {
    onDelete: "set null",
  }),
  japanese: text("japanese").notNull(),
  chinese: text("chinese").notNull(),
  exampleJp: text("example_jp").notNull().default(""),
  reviewStage: integer("review_stage").notNull().default(0),
  nextReviewAt: timestamp("next_review_at").default(sql`now()`).notNull(),
  lastReviewedAt: timestamp("last_reviewed_at"),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
});

export type User = typeof users.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Vocabulary = typeof vocabulary.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type NewVocabulary = typeof vocabulary.$inferInsert;
