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

export async function getCategories() {
  const userId = await getUserId();
  return db
    .select()
    .from(categories)
    .where(eq(categories.userId, userId))
    .orderBy(categories.createdAt);
}

export async function createCategory(name: string) {
  const userId = await getUserId();
  const trimmed = name.trim();
  if (!trimmed) throw new Error("分類名稱不能為空");

  const [created] = await db
    .insert(categories)
    .values({ userId, name: trimmed })
    .returning();

  revalidatePath("/vocabulary");
  revalidatePath("/");
  return created;
}

export async function deleteCategory(id: string) {
  const userId = await getUserId();
  await db
    .delete(categories)
    .where(and(eq(categories.id, id), eq(categories.userId, userId)));

  revalidatePath("/vocabulary");
  revalidatePath("/");
}
