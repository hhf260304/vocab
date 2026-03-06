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

export async function getCategories(languageId: string) {
  const userId = await getUserId();
  return db
    .select()
    .from(categories)
    .where(and(eq(categories.userId, userId), eq(categories.languageId, languageId)))
    .orderBy(categories.createdAt);
}

export async function createCategory(name: string, languageId: string) {
  const userId = await getUserId();
  const trimmed = name.trim();
  if (!trimmed) throw new Error("分類名稱不能為空");

  const [created] = await db
    .insert(categories)
    .values({ userId, name: trimmed, languageId })
    .returning();

  revalidatePath(`/languages/${languageId}`);
  return created;
}

export async function deleteCategory(id: string, languageId: string) {
  const userId = await getUserId();
  await db
    .delete(categories)
    .where(and(eq(categories.id, id), eq(categories.userId, userId)));

  revalidatePath(`/languages/${languageId}`);
}

export async function createCategories(
  names: string[],
  languageId: string
): Promise<{ duplicates: string[] } | { created: number }> {
  const userId = await getUserId();

  const trimmed = names.map((n) => n.trim()).filter(Boolean);
  if (trimmed.length === 0) return { created: 0 };

  // Fetch existing category names for this language
  const existing = await db
    .select({ name: categories.name })
    .from(categories)
    .where(and(eq(categories.userId, userId), eq(categories.languageId, languageId)));

  const existingNames = existing.map((c) => c.name.toLowerCase());

  // Find duplicates: against existing AND within input itself
  const seen = new Set<string>();
  const duplicates: string[] = [];

  for (const name of trimmed) {
    const lower = name.toLowerCase();
    if (existingNames.includes(lower) || seen.has(lower)) {
      duplicates.push(name);
    }
    seen.add(lower);
  }

  if (duplicates.length > 0) return { duplicates };

  await db.insert(categories).values(
    trimmed.map((name) => ({ userId, name, languageId }))
  );

  revalidatePath(`/languages/${languageId}`);
  return { created: trimmed.length };
}
