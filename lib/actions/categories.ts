// lib/actions/categories.ts
"use server";

import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { categories } from "@/lib/db/schema";

async function getUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("未登入");
  return session.user.id;
}

export async function getCategories(
  languageId: string,
  type?: "vocab" | "sentence"
) {
  const userId = await getUserId();
  const conditions = [
    eq(categories.userId, userId),
    eq(categories.languageId, languageId),
  ];
  if (type) conditions.push(eq(categories.type, type));
  return db
    .select()
    .from(categories)
    .where(and(...conditions))
    .orderBy(categories.createdAt);
}

export async function createCategory(
  name: string,
  languageId: string,
  type: "vocab" | "sentence" = "vocab"
) {
  const userId = await getUserId();
  const trimmed = name.trim();
  if (!trimmed) throw new Error("分類名稱不能為空");

  const [created] = await db
    .insert(categories)
    .values({ userId, name: trimmed, languageId, type })
    .returning();

  revalidatePath(`/languages/${languageId}`, "layout");
  return created;
}

export async function deleteCategory(id: string, languageId: string) {
  const userId = await getUserId();
  await db
    .delete(categories)
    .where(and(eq(categories.id, id), eq(categories.userId, userId)));

  revalidatePath(`/languages/${languageId}`, "layout");
}

export async function updateCategory(id: string, name: string, languageId: string) {
  const userId = await getUserId();
  const trimmed = name.trim();
  if (!trimmed) throw new Error("分類名稱不能為空");

  await db
    .update(categories)
    .set({ name: trimmed })
    .where(and(eq(categories.id, id), eq(categories.userId, userId)));

  revalidatePath(`/languages/${languageId}`, "layout");
}
