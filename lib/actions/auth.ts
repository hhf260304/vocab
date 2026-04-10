// lib/actions/auth.ts
"use server";

import { compare, hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

export async function register(username: string, password: string) {
  const trimmed = username.trim();
  if (!trimmed || trimmed.length < 2 || trimmed.length > 32) {
    return { error: "用戶名需介於 2 到 32 個字元" };
  }
  if (!password || password.length < 6) {
    return { error: "密碼至少需要 6 個字元" };
  }

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, trimmed))
    .limit(1);

  if (existing) {
    return { error: "此用戶名已被使用" };
  }

  const passwordHash = await hash(password, 10);

  try {
    await db.insert(users).values({
      id: crypto.randomUUID(),
      username: trimmed,
      passwordHash,
    });
  } catch {
    return { error: "註冊失敗，請稍後再試" };
  }

  return { success: true };
}

export async function changePassword(oldPassword: string, newPassword: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "請先登入" };
  }

  if (!newPassword || newPassword.length < 6) {
    return { error: "新密碼至少需要 6 個字元" };
  }

  const [user] = await db
    .select({ passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!user?.passwordHash) {
    return { error: "找不到使用者" };
  }

  const valid = await compare(oldPassword, user.passwordHash);
  if (!valid) {
    return { error: "目前密碼錯誤" };
  }

  const passwordHash = await hash(newPassword, 10);
  await db
    .update(users)
    .set({ passwordHash })
    .where(eq(users.id, session.user.id));

  return { success: true };
}
