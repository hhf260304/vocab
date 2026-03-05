// lib/db/schema.ts
import { sql } from "drizzle-orm";
import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").unique(),
  name: text("name"),
  image: text("image"),
  username: text("username").unique(),
  passwordHash: text("password_hash"),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
});

export const languages = pgTable("languages", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  ttsCode: text("tts_code").notNull(),
  defaultSide: text("default_side").notNull().default("front"),
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
  languageId: text("language_id").references(() => languages.id, {
    onDelete: "set null",
  }),
  categoryId: text("category_id").references(() => categories.id, {
    onDelete: "set null",
  }),
  // 欄位別名：DB 欄位名稱不變，TypeScript 使用 front/back
  front: text("japanese").notNull(),
  back: text("chinese").notNull(),
  exampleJp: text("example_jp").notNull().default(""),
  reviewStage: integer("review_stage").notNull().default(0),
  nextReviewAt: timestamp("next_review_at").default(sql`now()`).notNull(),
  lastReviewedAt: timestamp("last_reviewed_at"),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
});

export type User = typeof users.$inferSelect;
export type Language = typeof languages.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Vocabulary = typeof vocabulary.$inferSelect;
export type NewLanguage = typeof languages.$inferInsert;
export type NewCategory = typeof categories.$inferInsert;
export type NewVocabulary = typeof vocabulary.$inferInsert;
