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

export async function getVocabularies() {
  const userId = await getUserId();
  return db
    .select()
    .from(vocabulary)
    .where(eq(vocabulary.userId, userId))
    .orderBy(vocabulary.createdAt);
}

export async function getTodayReviews() {
  const userId = await getUserId();
  const now = new Date();
  return db
    .select()
    .from(vocabulary)
    .where(
      and(
        eq(vocabulary.userId, userId),
        lt(vocabulary.reviewStage, 5),
        lte(vocabulary.nextReviewAt, now)
      )
    );
}

export async function createVocabulary(data: {
  japanese: string;
  chinese: string;
  exampleJp?: string;
  categoryId: string | null;
}) {
  const userId = await getUserId();
  const [created] = await db
    .insert(vocabulary)
    .values({
      userId,
      japanese: data.japanese.trim(),
      chinese: data.chinese.trim(),
      exampleJp: data.exampleJp?.trim() ?? "",
      categoryId: data.categoryId,
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
    japanese?: string;
    chinese?: string;
    exampleJp?: string;
    categoryId?: string | null;
  }
) {
  const userId = await getUserId();
  await db
    .update(vocabulary)
    .set({
      ...(data.japanese !== undefined && { japanese: data.japanese.trim() }),
      ...(data.chinese !== undefined && { chinese: data.chinese.trim() }),
      ...(data.exampleJp !== undefined && { exampleJp: data.exampleJp.trim() }),
      ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
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

export async function markReview(id: string, remembered: boolean) {
  const userId = await getUserId();
  const [vocab] = await db
    .select()
    .from(vocabulary)
    .where(and(eq(vocabulary.id, id), eq(vocabulary.userId, userId)));

  if (!vocab) return;

  const { stage, nextReviewAt } = getNextReviewAt(vocab.reviewStage, remembered);

  await db
    .update(vocabulary)
    .set({
      reviewStage: stage,
      nextReviewAt: new Date(nextReviewAt),
      lastReviewedAt: new Date(),
    })
    .where(and(eq(vocabulary.id, id), eq(vocabulary.userId, userId)));

  revalidatePath("/");
}
