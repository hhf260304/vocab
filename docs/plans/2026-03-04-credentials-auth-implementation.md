# Credentials Auth Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add username + password registration and login alongside existing Google OAuth on the login page.

**Architecture:** Extend the `users` table with `username` and `passwordHash` columns; add NextAuth v5 `Credentials` provider that queries by username and verifies bcrypt hash; build a client-side form with login/register tabs; keep Google OAuth unchanged.

**Tech Stack:** Next.js 16 App Router, NextAuth v5 beta, Drizzle ORM, Neon PostgreSQL, bcryptjs, Tailwind CSS, shadcn/ui components

---

### Task 1: Install bcryptjs

**Files:**
- No file changes (package install only)

**Step 1: Install the package**

```bash
npm install bcryptjs
npm install --save-dev @types/bcryptjs
```

**Step 2: Verify install**

```bash
node -e "const b = require('bcryptjs'); console.log(b.hashSync('test', 10))"
```
Expected: a bcrypt hash string starting with `$2b$`

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: install bcryptjs for password hashing"
```

---

### Task 2: Extend DB schema with username and passwordHash

**Files:**
- Modify: `lib/db/schema.ts`

**Step 1: Update the users table definition**

In `lib/db/schema.ts`, replace the `users` table with:

```typescript
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").unique(),           // nullable — credentials users have no email
  name: text("name"),
  image: text("image"),
  username: text("username").unique(),     // credentials users' login identifier
  passwordHash: text("password_hash"),     // bcrypt hash; null for Google users
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
});
```

Note: remove `.notNull()` from `email` so credentials users (without email) can be inserted.

**Step 2: Generate the migration**

```bash
npx drizzle-kit generate
```
Expected: a new SQL file in `./drizzle/` containing `ALTER TABLE users ...`

**Step 3: Push migration to Neon**

```bash
npx drizzle-kit migrate
```
Expected: "Migration applied successfully"

**Step 4: Commit**

```bash
git add lib/db/schema.ts drizzle/
git commit -m "feat: add username and passwordHash columns to users table"
```

---

### Task 3: Add Credentials provider to auth.ts

**Files:**
- Modify: `auth.ts`

**Step 1: Rewrite auth.ts to add Credentials provider**

Replace the entire `auth.ts` with:

```typescript
// auth.ts
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google,
    Credentials({
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.username, credentials.username as string))
          .limit(1);

        if (!user || !user.passwordHash) return null;

        const valid = await compare(credentials.password as string, user.passwordHash);
        if (!valid) return null;

        return { id: user.id, name: user.username, email: user.email };
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, account, user }) {
      // account is only present on first sign-in (Google)
      if (account?.provider === "google") {
        await db
          .insert(users)
          .values({
            id: token.sub!,
            email: token.email!,
            name: token.name,
            image: token.picture,
          })
          .onConflictDoUpdate({
            target: users.id,
            set: { name: token.name, image: token.picture },
          });
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.sub!;
      return session;
    },
  },
});
```

**Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors

**Step 3: Commit**

```bash
git add auth.ts
git commit -m "feat: add Credentials provider to NextAuth config"
```

---

### Task 4: Create register server action

**Files:**
- Create: `lib/actions/auth.ts`

**Step 1: Create the file**

```typescript
// lib/actions/auth.ts
"use server";

import { hash } from "bcryptjs";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { signIn } from "@/auth";

export async function register(username: string, password: string) {
  if (!username || username.length < 2) {
    return { error: "用戶名至少需要 2 個字元" };
  }
  if (!password || password.length < 6) {
    return { error: "密碼至少需要 6 個字元" };
  }

  // Check username uniqueness
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
```

**Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors

**Step 3: Commit**

```bash
git add lib/actions/auth.ts
git commit -m "feat: add register server action with bcrypt hashing"
```

---

### Task 5: Build LoginForm client component

**Files:**
- Create: `app/(auth)/login/LoginForm.tsx`

**Step 1: Create the component**

```typescript
// app/(auth)/login/LoginForm.tsx
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { register } from "@/lib/actions/auth";

type Tab = "login" | "register";

export default function LoginForm() {
  const [tab, setTab] = useState<Tab>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (tab === "register") {
        const result = await register(username, password);
        if (result?.error) {
          setError(result.error);
        }
      } else {
        const result = await signIn("credentials", {
          username,
          password,
          redirect: false,
        });
        if (result?.error) {
          setError("用戶名或密碼錯誤");
        } else {
          router.push("/");
        }
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Tabs */}
      <div className="flex border border-border rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => { setTab("login"); setError(""); }}
          className={`flex-1 py-2 text-sm font-medium transition-colors ${
            tab === "login"
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          登入
        </button>
        <button
          type="button"
          onClick={() => { setTab("register"); setError(""); }}
          className={`flex-1 py-2 text-sm font-medium transition-colors ${
            tab === "register"
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          註冊
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <Label htmlFor="username" className="text-sm">用戶名</Label>
          <Input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="輸入用戶名"
            required
            autoComplete="username"
          />
        </div>

        <div className="flex flex-col gap-1">
          <Label htmlFor="password" className="text-sm">密碼</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={tab === "register" ? "至少 6 個字元" : "輸入密碼"}
            required
            autoComplete={tab === "register" ? "new-password" : "current-password"}
          />
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "請稍候…" : tab === "login" ? "登入" : "註冊"}
        </Button>
      </form>
    </div>
  );
}
```

**Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors

**Step 3: Commit**

```bash
git add app/\(auth\)/login/LoginForm.tsx
git commit -m "feat: add LoginForm client component with login/register tabs"
```

---

### Task 6: Update login page to show both forms

**Files:**
- Modify: `app/(auth)/login/page.tsx`

**Step 1: Replace the login page content**

```typescript
// app/(auth)/login/page.tsx
import { signIn } from "@/auth";
import { Button } from "@/components/ui/button";
import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
      <div className="bg-card border border-border rounded-2xl p-10 flex flex-col items-center gap-6 w-full max-w-sm shadow-sm">
        {/* Header */}
        <div className="flex flex-col items-center gap-1 text-center">
          <span className="text-4xl">📚</span>
          <h1 className="text-2xl font-bold text-foreground mt-2">VocabFlow</h1>
          <p className="text-muted-foreground text-sm">單字練習本</p>
        </div>

        {/* Credentials form */}
        <LoginForm />

        {/* Divider */}
        <div className="w-full flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground">或</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Google login */}
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/" });
          }}
          className="w-full"
        >
          <Button type="submit" variant="outline" className="w-full gap-3">
            <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            使用 Google 帳號登入
          </Button>
        </form>
      </div>
    </div>
  );
}
```

**Step 2: Start dev server and manually verify**

```bash
npm run dev
```

Check:
- [ ] Login page shows username/password form with login/register tabs
- [ ] Google login button still appears below a divider
- [ ] Switching tabs clears error message
- [ ] Registering a new user redirects to `/`
- [ ] Logging in with wrong password shows "用戶名或密碼錯誤"
- [ ] Logging in with correct credentials redirects to `/`
- [ ] Google OAuth still works

**Step 3: Commit**

```bash
git add app/\(auth\)/login/page.tsx
git commit -m "feat: update login page with credentials form and Google OAuth side by side"
```

---

## Summary

| Task | What changes |
|------|-------------|
| 1 | Install bcryptjs |
| 2 | Schema: `username`, `passwordHash` columns; `email` nullable |
| 3 | `auth.ts`: add Credentials provider |
| 4 | `lib/actions/auth.ts`: `register` server action |
| 5 | `app/(auth)/login/LoginForm.tsx`: client form with tabs |
| 6 | `app/(auth)/login/page.tsx`: combined login page |
