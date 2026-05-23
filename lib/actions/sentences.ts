// lib/actions/sentences.ts
"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull, lte, lt, count, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { sentences } from "@/lib/db/schema";
import { getNextReviewAt } from "@/lib/srs";

async function getUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("未登入");
  return session.user.id;
}

export async function getSentences(languageId?: string, categoryId?: string) {
  const userId = await getUserId();
  const conditions = [eq(sentences.userId, userId)];
  if (languageId) conditions.push(eq(sentences.languageId, languageId));
  if (categoryId === "uncategorized") {
    conditions.push(isNull(sentences.categoryId));
  } else if (categoryId) {
    conditions.push(eq(sentences.categoryId, categoryId));
  }
  return db
    .select()
    .from(sentences)
    .where(and(...conditions))
    .orderBy(sentences.createdAt);
}

export async function getSentenceCounts(
  languageId: string
): Promise<{ total: number; graduated: number }> {
  const userId = await getUserId();
  const [result] = await db
    .select({
      total: count(),
      graduated: sql<number>`count(*) filter (where ${sentences.reviewStage} = 6)`,
    })
    .from(sentences)
    .where(and(eq(sentences.userId, userId), eq(sentences.languageId, languageId)));
  return { total: result?.total ?? 0, graduated: Number(result?.graduated ?? 0) };
}

export async function getTodaySentenceReviews(languageId: string, categoryId?: string) {
  const userId = await getUserId();
  const now = new Date();
  const conditions = [
    eq(sentences.userId, userId),
    eq(sentences.languageId, languageId),
    lt(sentences.reviewStage, 6),
    lte(sentences.nextReviewAt, now),
  ];
  if (categoryId === "uncategorized") {
    conditions.push(isNull(sentences.categoryId));
  } else if (categoryId) {
    conditions.push(eq(sentences.categoryId, categoryId));
  }
  return db.select().from(sentences).where(and(...conditions));
}

export async function createSentence(data: {
  front: string;
  back: string;
  categoryId: string | null;
  languageId: string | null;
}) {
  const userId = await getUserId();
  const [created] = await db
    .insert(sentences)
    .values({
      userId,
      front: data.front.trim(),
      back: data.back.trim(),
      categoryId: data.categoryId,
      languageId: data.languageId,
      reviewStage: 0,
      nextReviewAt: new Date(),
    })
    .returning();

  revalidatePath("/");
  if (data.languageId) {
    revalidatePath(`/languages/${data.languageId}`, "layout");
  }
  return created;
}

export async function updateSentence(
  id: string,
  data: {
    front?: string;
    back?: string;
    categoryId?: string | null;
    languageId?: string | null;
  }
) {
  const userId = await getUserId();
  await db
    .update(sentences)
    .set({
      ...(data.front !== undefined && { front: data.front.trim() }),
      ...(data.back !== undefined && { back: data.back.trim() }),
      ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
      ...(data.languageId !== undefined && { languageId: data.languageId }),
    })
    .where(and(eq(sentences.id, id), eq(sentences.userId, userId)));

  revalidatePath("/");
  if (data.languageId) revalidatePath(`/languages/${data.languageId}`, "layout");
}

export async function deleteSentence(id: string, languageId?: string) {
  const userId = await getUserId();
  await db
    .delete(sentences)
    .where(and(eq(sentences.id, id), eq(sentences.userId, userId)));

  revalidatePath("/");
  if (languageId) revalidatePath(`/languages/${languageId}`, "layout");
}

export async function markSentenceReview(id: string, remembered: boolean) {
  const userId = await getUserId();
  const [sentence] = await db
    .select()
    .from(sentences)
    .where(and(eq(sentences.id, id), eq(sentences.userId, userId)));

  if (!sentence) return;

  const { stage, nextReviewAt } = getNextReviewAt(sentence.reviewStage, remembered);

  const nextReviewAtDate =
    nextReviewAt === Infinity
      ? new Date("9999-12-31T00:00:00Z")
      : new Date(nextReviewAt);

  await db
    .update(sentences)
    .set({
      reviewStage: stage,
      nextReviewAt: nextReviewAtDate,
      lastReviewedAt: new Date(),
      ...(remembered ? {} : { failCount: sql`${sentences.failCount} + 1` }),
    })
    .where(and(eq(sentences.id, id), eq(sentences.userId, userId)));

  revalidatePath("/");
  if (sentence.languageId) {
    revalidatePath(`/languages/${sentence.languageId}`, "layout");
  }
}

export async function getCategorySentenceCounts(
  languageId: string
): Promise<Record<string, number>> {
  const userId = await getUserId();
  const rows = await db
    .select({
      categoryId: sentences.categoryId,
      total: count(),
    })
    .from(sentences)
    .where(and(eq(sentences.userId, userId), eq(sentences.languageId, languageId)))
    .groupBy(sentences.categoryId);

  const result: Record<string, number> = {};
  for (const row of rows) {
    result[row.categoryId ?? "uncategorized"] = row.total;
  }
  return result;
}

export async function createSentences(
  items: { front: string; back: string }[],
  languageId: string,
  categoryId: string | null
): Promise<{ created: number }> {
  const userId = await getUserId();
  if (items.length === 0) return { created: 0 };
  if (items.length > 200) throw new Error("單次最多批次新增 200 筆");

  await db.insert(sentences).values(
    items.map((item) => ({
      userId,
      languageId,
      categoryId,
      front: item.front.trim(),
      back: item.back.trim(),
      reviewStage: 0,
      nextReviewAt: new Date(),
    }))
  );

  revalidatePath("/");
  revalidatePath(`/languages/${languageId}`, "layout");
  return { created: items.length };
}
