// lib/actions/vocabulary.ts
"use server";

import { revalidatePath } from "next/cache";
import { and, eq, lte, lt } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { vocabulary } from "@/lib/db/schema";
import { getNextReviewAt } from "@/lib/srs";

async function getUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("未登入");
  return session.user.id;
}

export async function getVocabularies(languageId?: string) {
  const userId = await getUserId();
  const conditions = [eq(vocabulary.userId, userId)];
  if (languageId) conditions.push(eq(vocabulary.languageId, languageId));
  return db
    .select()
    .from(vocabulary)
    .where(and(...conditions))
    .orderBy(vocabulary.createdAt);
}

export async function getTodayReviews(languageId: string) {
  const userId = await getUserId();
  const now = new Date();
  return db
    .select()
    .from(vocabulary)
    .where(
      and(
        eq(vocabulary.userId, userId),
        eq(vocabulary.languageId, languageId),
        lt(vocabulary.reviewStage, 5),
        lte(vocabulary.nextReviewAt, now)
      )
    );
}

export async function createVocabulary(data: {
  front: string;
  back: string;
  exampleJp?: string;
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
      categoryId: data.categoryId,
      languageId: data.languageId,
      reviewStage: 0,
      nextReviewAt: new Date(),
    })
    .returning();

  revalidatePath("/vocabulary");
  revalidatePath("/");
  return created;
}

export async function updateVocabulary(
  id: string,
  data: {
    front?: string;
    back?: string;
    exampleJp?: string;
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
      ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
      ...(data.languageId !== undefined && { languageId: data.languageId }),
    })
    .where(and(eq(vocabulary.id, id), eq(vocabulary.userId, userId)));

  revalidatePath("/vocabulary");
  revalidatePath("/");
}

export async function deleteVocabulary(id: string) {
  const userId = await getUserId();
  await db
    .delete(vocabulary)
    .where(and(eq(vocabulary.id, id), eq(vocabulary.userId, userId)));

  revalidatePath("/vocabulary");
  revalidatePath("/");
}

export async function getVocabularyById(id: string) {
  const userId = await getUserId();
  const [vocab] = await db
    .select()
    .from(vocabulary)
    .where(and(eq(vocabulary.id, id), eq(vocabulary.userId, userId)));
  return vocab ?? null;
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
    })
    .where(and(eq(vocabulary.id, id), eq(vocabulary.userId, userId)));

  revalidatePath("/");
}
