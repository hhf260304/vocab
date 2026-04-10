// lib/actions/vocabulary.ts
"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull, lte, lt, count, sql, gt, desc } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { vocabulary, categories } from "@/lib/db/schema";
import { getNextReviewAt } from "@/lib/srs";

async function getUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("未登入");
  return session.user.id;
}

export async function getVocabularies(languageId?: string, categoryId?: string) {
  const userId = await getUserId();
  const conditions = [eq(vocabulary.userId, userId)];
  if (languageId) conditions.push(eq(vocabulary.languageId, languageId));
  if (categoryId === "uncategorized") {
    conditions.push(isNull(vocabulary.categoryId));
  } else if (categoryId) {
    conditions.push(eq(vocabulary.categoryId, categoryId));
  }
  return db
    .select()
    .from(vocabulary)
    .where(and(...conditions))
    .orderBy(vocabulary.createdAt);
}

export async function getVocabularyCounts(
  languageId: string
): Promise<{ total: number; graduated: number }> {
  const userId = await getUserId();
  const [result] = await db
    .select({
      total: count(),
      graduated: sql<number>`count(*) filter (where ${vocabulary.reviewStage} = 6)`,
    })
    .from(vocabulary)
    .where(and(eq(vocabulary.userId, userId), eq(vocabulary.languageId, languageId)));
  return { total: result?.total ?? 0, graduated: Number(result?.graduated ?? 0) };
}

export async function getCategoryVocabCounts(
  languageId: string
): Promise<Record<string, number>> {
  const userId = await getUserId();
  const rows = await db
    .select({
      categoryId: vocabulary.categoryId,
      count: count(),
    })
    .from(vocabulary)
    .where(and(eq(vocabulary.userId, userId), eq(vocabulary.languageId, languageId)))
    .groupBy(vocabulary.categoryId);

  const result: Record<string, number> = {};
  for (const row of rows) {
    result[row.categoryId ?? "uncategorized"] = row.count;
  }
  return result;
}

export async function getTodayReviews(languageId: string, categoryId?: string) {
  const userId = await getUserId();
  const now = new Date();
  const conditions = [
    eq(vocabulary.userId, userId),
    eq(vocabulary.languageId, languageId),
    lt(vocabulary.reviewStage, 6),
    lte(vocabulary.nextReviewAt, now),
  ];
  if (categoryId === "uncategorized") {
    conditions.push(isNull(vocabulary.categoryId));
  } else if (categoryId) {
    conditions.push(eq(vocabulary.categoryId, categoryId));
  }
  return db.select().from(vocabulary).where(and(...conditions));
}

export async function createVocabulary(data: {
  front: string;
  back: string;
  exampleJp?: string;
  zhuyin?: string;
  categoryId: string | null;
  languageId: string | null;
}) {
  const userId = await getUserId();
  const [created] = await db
    .insert(vocabulary)
    .values({
      userId,
      front: data.front.trim(),
      back: data.back.trim(),
      exampleJp: data.exampleJp?.trim() ?? "",
      zhuyin: data.zhuyin?.trim() ?? "",
      categoryId: data.categoryId,
      languageId: data.languageId,
      reviewStage: 0,
      nextReviewAt: new Date(),
    })
    .returning();

  revalidatePath("/");
  if (data.languageId) {
    revalidatePath(`/languages/${data.languageId}`, "layout");
    revalidatePath(`/review/${data.languageId}`);
  }
  return created;
}

export async function updateVocabulary(
  id: string,
  data: {
    front?: string;
    back?: string;
    exampleJp?: string;
    zhuyin?: string;
    categoryId?: string | null;
    languageId?: string | null;
  }
) {
  const userId = await getUserId();
  await db
    .update(vocabulary)
    .set({
      ...(data.front !== undefined && { front: data.front.trim() }),
      ...(data.back !== undefined && { back: data.back.trim() }),
      ...(data.exampleJp !== undefined && { exampleJp: data.exampleJp.trim() }),
      ...(data.zhuyin !== undefined && { zhuyin: data.zhuyin.trim() }),
      ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
      ...(data.languageId !== undefined && { languageId: data.languageId }),
    })
    .where(and(eq(vocabulary.id, id), eq(vocabulary.userId, userId)));

  revalidatePath("/");
  if (data.languageId) revalidatePath(`/languages/${data.languageId}`, "layout");
}

export async function createVocabularies(
  items: { front: string; back: string; exampleJp: string; zhuyin: string }[],
  languageId: string,
  categoryId: string | null
): Promise<{ created: number }> {
  const userId = await getUserId();
  if (items.length === 0) return { created: 0 };

  await db.insert(vocabulary).values(
    items.map((item) => ({
      userId,
      languageId,
      categoryId,
      front: item.front,
      back: item.back,
      exampleJp: item.exampleJp,
      zhuyin: item.zhuyin,
      reviewStage: 0,
      nextReviewAt: new Date(),
    }))
  );

  revalidatePath(`/languages/${languageId}`, "layout");
  revalidatePath(`/review/${languageId}`);
  return { created: items.length };
}

export async function deleteVocabulary(id: string, languageId?: string) {
  const userId = await getUserId();
  await db
    .delete(vocabulary)
    .where(and(eq(vocabulary.id, id), eq(vocabulary.userId, userId)));

  revalidatePath("/");
  if (languageId) revalidatePath(`/languages/${languageId}`, "layout");
}

export async function getVocabularyById(id: string) {
  const userId = await getUserId();
  const [vocab] = await db
    .select()
    .from(vocabulary)
    .where(and(eq(vocabulary.id, id), eq(vocabulary.userId, userId)));
  return vocab ?? null;
}

export type GraduatedVocab = {
  id: string;
  front: string;
  back: string;
  categoryName: string | null;
  lastReviewedAt: Date | null;
};

export async function getGraduatedVocab(
  languageId: string
): Promise<GraduatedVocab[]> {
  const userId = await getUserId();
  return db
    .select({
      id: vocabulary.id,
      front: vocabulary.front,
      back: vocabulary.back,
      categoryName: categories.name,
      lastReviewedAt: vocabulary.lastReviewedAt,
    })
    .from(vocabulary)
    .leftJoin(categories, eq(vocabulary.categoryId, categories.id))
    .where(
      and(
        eq(vocabulary.userId, userId),
        eq(vocabulary.languageId, languageId),
        eq(vocabulary.reviewStage, 6)
      )
    );
}

export async function markReview(id: string, remembered: boolean) {
  const userId = await getUserId();
  const [vocab] = await db
    .select()
    .from(vocabulary)
    .where(and(eq(vocabulary.id, id), eq(vocabulary.userId, userId)));

  if (!vocab) return;

  const { stage, nextReviewAt } = getNextReviewAt(vocab.reviewStage, remembered);

  const nextReviewAtDate =
    nextReviewAt === Infinity
      ? new Date("9999-12-31T00:00:00Z")
      : new Date(nextReviewAt);

  await db
    .update(vocabulary)
    .set({
      reviewStage: stage,
      nextReviewAt: nextReviewAtDate,
      lastReviewedAt: new Date(),
      ...(remembered ? {} : { failCount: sql`${vocabulary.failCount} + 1` }),
    })
    .where(and(eq(vocabulary.id, id), eq(vocabulary.userId, userId)));

  revalidatePath("/");
  if (vocab.languageId) {
    revalidatePath(`/languages/${vocab.languageId}/stats`);
  }
}

export type FailStat = {
  id: string;
  front: string;
  back: string;
  failCount: number;
  categoryName: string | null;
};

export async function getFailStats(languageId: string): Promise<FailStat[]> {
  const userId = await getUserId();
  return db
    .select({
      id: vocabulary.id,
      front: vocabulary.front,
      back: vocabulary.back,
      failCount: vocabulary.failCount,
      categoryName: categories.name,
    })
    .from(vocabulary)
    .leftJoin(categories, eq(vocabulary.categoryId, categories.id))
    .where(
      and(
        eq(vocabulary.userId, userId),
        eq(vocabulary.languageId, languageId),
        gt(vocabulary.failCount, 0)
      )
    )
    .orderBy(desc(vocabulary.failCount));
}
