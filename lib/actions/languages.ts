// lib/actions/languages.ts
"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { languages } from "@/lib/db/schema";

async function getUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("未登入");
  return session.user.id;
}

export async function getLanguages() {
  const userId = await getUserId();
  return db
    .select()
    .from(languages)
    .where(eq(languages.userId, userId))
    .orderBy(languages.createdAt);
}

export async function createLanguage(data: {
  name: string;
  ttsCode: string;
}) {
  const userId = await getUserId();
  const [created] = await db
    .insert(languages)
    .values({
      userId,
      name: data.name,
      ttsCode: data.ttsCode,
    })
    .returning();
  revalidatePath("/");
  return created;
}

export async function deleteLanguage(id: string) {
  const userId = await getUserId();
  await db
    .delete(languages)
    .where(and(eq(languages.id, id), eq(languages.userId, userId)));
  revalidatePath("/");
}

export async function getLanguageById(id: string) {
  const userId = await getUserId();
  const [lang] = await db
    .select()
    .from(languages)
    .where(and(eq(languages.id, id), eq(languages.userId, userId)));
  return lang ?? null;
}
