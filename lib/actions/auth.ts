// lib/actions/auth.ts
"use server";

import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { signIn } from "@/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

export async function register(username: string, password: string) {
  if (!username || username.length < 2) {
    return { error: "用戶名至少需要 2 個字元" };
  }
  if (!password || password.length < 6) {
    return { error: "密碼至少需要 6 個字元" };
  }

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  if (existing) {
    return { error: "此用戶名已被使用" };
  }

  const passwordHash = await hash(password, 10);

  await db.insert(users).values({
    id: crypto.randomUUID(),
    username,
    passwordHash,
  });

  // Auto-login after registration
  await signIn("credentials", { username, password, redirectTo: "/" });
}
