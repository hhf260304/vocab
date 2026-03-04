# Google Auth + Neon DB Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Google OAuth login via Auth.js v5, store per-user data in Neon PostgreSQL with Drizzle ORM, and migrate all pages from Zustand client state to server actions.

**Architecture:** Auth.js v5 with JWT strategy handles Google OAuth; on first sign-in a user row is upserted into Neon. All vocabulary/category data is stored in Neon with `userId` foreign keys, accessed via Drizzle server actions. Pages are converted from `"use client"` Zustand consumers to Server Components + thin Client Components that call server actions. `middleware.ts` protects all routes except `/login` and `/api/auth/**`.

**Tech Stack:** Next.js 16 App Router, Auth.js v5 (`next-auth@beta`), Drizzle ORM, `@neondatabase/serverless`, Neon PostgreSQL, TypeScript, Tailwind v4, shadcn/ui

---

## Pre-requisites (do these manually before starting)

1. Create a Neon project at https://neon.tech — copy the **pooled connection string** (starts with `postgresql://...?sslmode=require`)
2. Create a Google OAuth app at https://console.cloud.google.com:
   - Authorised redirect URI: `http://localhost:3000/api/auth/callback/google`
   - Copy **Client ID** and **Client Secret**
3. Create `.env.local` in project root:
   ```
   DATABASE_URL="postgresql://..."  # Neon pooled connection string
   AUTH_SECRET="run: npx auth secret  # or any 32+ char random string"
   AUTH_GOOGLE_ID="your-google-client-id"
   AUTH_GOOGLE_SECRET="your-google-client-secret"
   ```

---

## Task 1: Install Dependencies

**Files:**
- Modify: `package.json` (via npm install)

**Step 1: Install runtime dependencies**

```bash
npm install next-auth@beta drizzle-orm @neondatabase/serverless
```

**Step 2: Install dev dependencies**

```bash
npm install -D drizzle-kit
```

**Step 3: Verify installs**

```bash
cat package.json | grep -E "next-auth|drizzle|neon"
```

Expected output includes `next-auth`, `drizzle-orm`, `@neondatabase/serverless`, `drizzle-kit`.

**Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install next-auth, drizzle-orm, neon dependencies"
```

---

## Task 2: Create Drizzle Config and DB Schema

**Files:**
- Create: `drizzle.config.ts`
- Create: `lib/db/schema.ts`

**Step 1: Create drizzle.config.ts**

```typescript
// drizzle.config.ts
import type { Config } from "drizzle-kit";

export default {
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;
```

**Step 2: Create lib/db/schema.ts**

Note: `categoryId` is a single nullable FK — this simplifies the model. The existing UI already only allows selecting one category at a time (even though `categoryIds` was an array, `categoryIds[0]` was the effective value).

```typescript
// lib/db/schema.ts
import { sql } from "drizzle-orm";
import {
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  image: text("image"),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
});

export const categories = pgTable("categories", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
});

export const vocabulary = pgTable("vocabulary", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  categoryId: text("category_id").references(() => categories.id, {
    onDelete: "set null",
  }),
  japanese: text("japanese").notNull(),
  chinese: text("chinese").notNull(),
  exampleJp: text("example_jp").notNull().default(""),
  reviewStage: integer("review_stage").notNull().default(0),
  nextReviewAt: timestamp("next_review_at").default(sql`now()`).notNull(),
  lastReviewedAt: timestamp("last_reviewed_at"),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
});

export type User = typeof users.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Vocabulary = typeof vocabulary.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type NewVocabulary = typeof vocabulary.$inferInsert;
```

**Step 3: Commit**

```bash
git add drizzle.config.ts lib/db/schema.ts
git commit -m "feat: add drizzle config and DB schema"
```

---

## Task 3: Create Drizzle Client and Push Schema to Neon

**Files:**
- Create: `lib/db/index.ts`

**Step 1: Create lib/db/index.ts**

```typescript
// lib/db/index.ts
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });
```

**Step 2: Push schema to Neon (creates tables)**

```bash
npx drizzle-kit push
```

Expected: output shows "users", "categories", "vocabulary" tables created. No errors.

If you see a connection error, verify `DATABASE_URL` in `.env.local` is correct.

**Step 3: Commit**

```bash
git add lib/db/index.ts
git commit -m "feat: add drizzle client"
```

---

## Task 4: Configure Auth.js v5

**Files:**
- Create: `auth.ts`
- Create: `types/next-auth.d.ts`

**Step 1: Create auth.ts**

```typescript
// auth.ts
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [Google],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, account }) {
      // account is only present on first sign-in
      if (account) {
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

**Step 2: Create types/next-auth.d.ts to expose user.id on the session type**

```typescript
// types/next-auth.d.ts
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}
```

**Step 3: Commit**

```bash
git add auth.ts types/next-auth.d.ts
git commit -m "feat: configure Auth.js v5 with Google provider"
```

---

## Task 5: Create Auth.js API Route and Middleware

**Files:**
- Create: `app/api/auth/[...nextauth]/route.ts`
- Create: `middleware.ts`

**Step 1: Create app/api/auth/[...nextauth]/route.ts**

```typescript
// app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/auth";
export const { GET, POST } = handlers;
```

**Step 2: Create middleware.ts**

```typescript
// middleware.ts
import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isLoginPage = req.nextUrl.pathname === "/login";

  if (!isLoggedIn && !isLoginPage) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (isLoggedIn && isLoginPage) {
    return NextResponse.redirect(new URL("/", req.url));
  }
});

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
```

**Step 3: Test manually**

Run `npm run dev`. Visit `http://localhost:3000` — you should be redirected to `/login` (which doesn't exist yet, so you'll see a 404). That's expected.

**Step 4: Commit**

```bash
git add app/api/auth/[...nextauth]/route.ts middleware.ts
git commit -m "feat: add Auth.js API route and route protection middleware"
```

---

## Task 6: Create Login Page

**Files:**
- Create: `app/(auth)/login/page.tsx`

The `(auth)` route group means this route is `/login` but uses the root layout without Navbar (we'll handle layout next).

**Step 1: Create app/(auth)/login/page.tsx**

```tsx
// app/(auth)/login/page.tsx
import { signIn } from "@/auth";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
      <div className="bg-card border border-border rounded-2xl p-10 flex flex-col items-center gap-6 w-full max-w-sm shadow-sm">
        <div className="flex flex-col items-center gap-1 text-center">
          <span className="text-4xl">📚</span>
          <h1 className="text-2xl font-bold text-foreground mt-2">VocabFlow</h1>
          <p className="text-muted-foreground text-sm">單字練習本</p>
        </div>

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

**Step 2: Suppress Navbar on the login page**

The root `app/layout.tsx` shows Navbar on every page. We need to hide it on `/login`. Create an inner layout for the auth group that overrides the root layout's Navbar:

Edit `app/(auth)/login/page.tsx` — the `(auth)` route group will inherit from root layout which includes Navbar. To hide Navbar on login, add a layout file for the group:

Create `app/(auth)/layout.tsx`:

```tsx
// app/(auth)/layout.tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
```

Wait — the root `app/layout.tsx` always renders `<Navbar />`. The `(auth)/layout.tsx` can't remove it because layouts are nested, not replacing. Instead, make Navbar aware of the login page.

**Revised approach:** Update `app/layout.tsx` to conditionally hide Navbar. Since layout is a Server Component, we can use `headers()` or just pass no Navbar for the login route by checking if the page is login.

Simplest fix: move Navbar rendering into each non-auth page layout. But that's invasive.

**Cleanest fix:** Update `components/Navbar.tsx` to return null on `/login` by checking the pathname. Since Navbar is already `"use client"` and uses `usePathname()`:

Edit `components/Navbar.tsx` — add early return:

```tsx
// components/Navbar.tsx — add after usePathname():
const pathname = usePathname();
if (pathname === "/login") return null;
```

**Step 3: Test manually**

Run `npm run dev`. Visit `http://localhost:3000` — should redirect to `/login`. The login page should show with the Google button. Navbar should NOT appear on `/login`. Click the button — should start Google OAuth flow (will fail if `AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET` aren't set yet, but the redirect should happen).

**Step 4: Commit**

```bash
git add app/(auth)/login/page.tsx app/(auth)/layout.tsx components/Navbar.tsx
git commit -m "feat: add login page with Google sign-in button"
```

---

## Task 7: Create Server Actions — Categories

**Files:**
- Create: `lib/actions/categories.ts`

**Step 1: Create lib/actions/categories.ts**

```typescript
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
```

**Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors related to `lib/actions/categories.ts`.

**Step 3: Commit**

```bash
git add lib/actions/categories.ts
git commit -m "feat: add category server actions"
```

---

## Task 8: Create Server Actions — Vocabulary

**Files:**
- Create: `lib/actions/vocabulary.ts`

**Step 1: Create lib/actions/vocabulary.ts**

```typescript
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
```

**Step 2: Check lib/srs.ts signature**

Look at `lib/srs.ts` to confirm `getNextReviewAt` returns `{ stage, nextReviewAt }`. The existing store uses it as:
```typescript
const { stage, nextReviewAt } = getNextReviewAt(vocab.reviewStage, remembered);
```
So the signature is already correct.

**Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add lib/actions/vocabulary.ts
git commit -m "feat: add vocabulary server actions"
```

---

## Task 9: Update lib/types.ts

**Files:**
- Modify: `lib/types.ts`

The type `categoryIds: string[]` becomes `categoryId: string | null`. This is a breaking change across multiple files — subsequent tasks fix each consumer.

**Step 1: Update lib/types.ts**

```typescript
// lib/types.ts
export interface Vocabulary {
  id: string;
  japanese: string;
  chinese: string;
  exampleJp: string;
  categoryId: string | null;
  createdAt: number;
  reviewStage: 0 | 1 | 2 | 3 | 4 | 5;
  nextReviewAt: number;
  lastReviewedAt?: number;
}

export interface Category {
  id: string;
  name: string;
}

export type VocabFormData = Omit<
  Vocabulary,
  "id" | "createdAt" | "reviewStage" | "nextReviewAt" | "lastReviewedAt"
>;
```

Note: After migration, pages will use the Drizzle-inferred types from `lib/db/schema.ts` directly. `lib/types.ts` will be used only by `VocabForm` during the transition and can be removed once all pages are migrated.

**Step 2: Commit (TypeScript will show errors — that's expected until all consumers are fixed)**

```bash
git add lib/types.ts
git commit -m "refactor: change categoryIds array to single categoryId in types"
```

---

## Task 10: Update VocabForm Component

**Files:**
- Modify: `components/VocabForm.tsx`

Remove Zustand dependency. Accept `categories` as a prop and `onCreateCategory` as an async callback.

**Step 1: Replace components/VocabForm.tsx**

```tsx
// components/VocabForm.tsx
"use client";

import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { Category } from "@/lib/db/schema";
import type { VocabFormData } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  categories: Category[];
  initialData?: VocabFormData & { id?: string };
  onSubmit: (data: VocabFormData) => void;
  onCreateCategory?: (name: string) => Promise<Category>;
  submitLabel: string;
  showCategorySelector?: boolean;
}

export default function VocabForm({
  categories,
  initialData,
  onSubmit,
  onCreateCategory,
  submitLabel,
  showCategorySelector = false,
}: Props) {
  const [catOpen, setCatOpen] = useState(false);
  const [catSearch, setCatSearch] = useState("");
  const [form, setForm] = useState<VocabFormData>({
    japanese: "",
    chinese: "",
    exampleJp: "",
    categoryId: null,
    ...initialData,
  });

  function speak(text: string) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ja-JP";
    speechSynthesis.speak(utterance);
  }

  function setField(field: keyof VocabFormData, value: string | null) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleSelectCategory(catId: string) {
    setField("categoryId", form.categoryId === catId ? null : catId);
    setCatOpen(false);
    setCatSearch("");
  }

  async function handleCreateCategory() {
    const trimmed = catSearch.trim();
    if (!trimmed || !onCreateCategory) return;
    const created = await onCreateCategory(trimmed);
    setField("categoryId", created.id);
    setCatOpen(false);
    setCatSearch("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.japanese || !form.chinese) return;
    onSubmit(form);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="japanese">日文 *</Label>
        <div className="flex gap-2">
          <Input
            id="japanese"
            value={form.japanese}
            onChange={(e) => setField("japanese", e.target.value)}
            placeholder="例：食べる"
            required
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => speak(form.japanese)}
            title="朗讀"
          >
            🔊
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="chinese">中文意思 *</Label>
        <Input
          id="chinese"
          value={form.chinese}
          onChange={(e) => setField("chinese", e.target.value)}
          placeholder="例：吃"
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="exampleJp">例句（日文）</Label>
        <Input
          id="exampleJp"
          value={form.exampleJp}
          onChange={(e) => setField("exampleJp", e.target.value)}
          placeholder="例：ご飯を食べる。"
        />
      </div>

      {showCategorySelector && (
        <div className="flex flex-col gap-1.5">
          <Label>分類</Label>
          <Popover open={catOpen} onOpenChange={setCatOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                role="combobox"
                aria-expanded={catOpen}
                className="w-full justify-between font-normal"
              >
                {form.categoryId
                  ? (categories.find((c) => c.id === form.categoryId)?.name ??
                    "— 不指定分類 —")
                  : "— 不指定分類 —"}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
              <Command>
                <CommandInput
                  placeholder="搜尋或輸入新分類…"
                  value={catSearch}
                  onValueChange={setCatSearch}
                />
                <CommandList>
                  <CommandEmpty>
                    {catSearch.trim() ? (
                      <button
                        type="button"
                        onClick={handleCreateCategory}
                        className="flex w-full items-center gap-2 px-2 py-1.5 text-sm hover:bg-accent"
                      >
                        <Plus className="h-4 w-4" />
                        建立「{catSearch.trim()}」
                      </button>
                    ) : (
                      <p className="py-2 text-center text-sm text-muted-foreground">
                        尚無分類
                      </p>
                    )}
                  </CommandEmpty>
                  <CommandGroup>
                    {categories.map((cat) => (
                      <CommandItem
                        key={cat.id}
                        value={cat.name}
                        onSelect={() => handleSelectCategory(cat.id)}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            form.categoryId === cat.id
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                        {cat.name}
                      </CommandItem>
                    ))}
                    {catSearch.trim() &&
                      !categories.some(
                        (c) =>
                          c.name.toLowerCase() ===
                          catSearch.trim().toLowerCase()
                      ) && (
                        <CommandItem
                          value={`__create__${catSearch}`}
                          onSelect={handleCreateCategory}
                          className="text-muted-foreground"
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          建立「{catSearch.trim()}」
                        </CommandItem>
                      )}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      )}

      <Button type="submit" className="w-full mt-2">
        {submitLabel}
      </Button>
    </form>
  );
}
```

**Step 2: Commit**

```bash
git add components/VocabForm.tsx
git commit -m "refactor: remove zustand from VocabForm, accept categories as props"
```

---

## Task 11: Migrate Vocabulary Page

**Files:**
- Modify: `app/vocabulary/page.tsx`

Convert from `"use client"` + Zustand to Server Component that fetches data, with a client component for interactions.

**Step 1: Create app/vocabulary/VocabularyClient.tsx**

```tsx
// app/vocabulary/VocabularyClient.tsx
"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import VocabCard from "@/components/VocabCard";
import {
  createCategory,
  deleteCategory,
} from "@/lib/actions/categories";
import { deleteVocabulary } from "@/lib/actions/vocabulary";
import type { Category, Vocabulary } from "@/lib/db/schema";

function CategorySection({
  cat,
  name,
  vocabs,
  categories,
  onDelete,
  onDeleteCategory,
}: {
  cat?: Category;
  name: string;
  vocabs: Vocabulary[];
  categories: Category[];
  onDelete: (id: string) => void;
  onDeleteCategory?: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="bg-card rounded-2xl border border-border overflow-hidden"
    >
      <div className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/50 transition-colors">
        <CollapsibleTrigger className="flex items-center gap-2 flex-1 text-left">
          <span className="font-semibold text-foreground">{name}</span>
          <span className="text-sm text-muted-foreground">
            {vocabs.length} 個單字
          </span>
          <span className="text-muted-foreground text-xs ml-auto">
            {open ? "▼" : "▶"}
          </span>
        </CollapsibleTrigger>
        <div className="flex items-center gap-2 ml-3 shrink-0">
          {cat && (
            <Button size="sm" asChild>
              <Link href={`/vocabulary/new?categoryId=${cat.id}`}>+ 單字</Link>
            </Button>
          )}
          {cat && onDeleteCategory && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-destructive px-2"
              onClick={() => onDeleteCategory(cat.id)}
              aria-label={`刪除分類「${name}」`}
            >
              ×
            </Button>
          )}
        </div>
      </div>
      <CollapsibleContent>
        <div className="flex flex-col gap-px border-t border-border">
          {vocabs.length === 0 ? (
            <p className="text-sm text-muted-foreground px-5 py-4">
              還沒有單字，點「+ 單字」開始新增
            </p>
          ) : (
            vocabs.map((vocab) => (
              <div key={vocab.id} className="px-2 py-1">
                <VocabCard
                  vocab={vocab}
                  categories={categories}
                  onDelete={() => onDelete(vocab.id)}
                />
              </div>
            ))
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export default function VocabularyClient({
  initialCategories,
  initialVocabularies,
}: {
  initialCategories: Category[];
  initialVocabularies: Vocabulary[];
}) {
  const [showCatInput, setShowCatInput] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [catError, setCatError] = useState("");
  const [pendingDelete, setPendingDelete] = useState<{
    type: "vocab" | "category";
    id: string;
    name: string;
  } | null>(null);
  const [, startTransition] = useTransition();

  function handleDelete(id: string) {
    const vocab = initialVocabularies.find((v) => v.id === id);
    if (vocab) setPendingDelete({ type: "vocab", id, name: vocab.japanese });
  }

  function handleDeleteCategory(id: string) {
    const cat = initialCategories.find((c) => c.id === id);
    if (cat) setPendingDelete({ type: "category", id, name: cat.name });
  }

  function confirmDelete() {
    if (!pendingDelete) return;
    startTransition(async () => {
      if (pendingDelete.type === "vocab") {
        await deleteVocabulary(pendingDelete.id);
      } else {
        await deleteCategory(pendingDelete.id);
      }
    });
    setPendingDelete(null);
  }

  function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newCatName.trim();
    if (!trimmed) return;
    const isDuplicate = initialCategories.some(
      (c) => c.name.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (isDuplicate) {
      setCatError(`「${trimmed}」分類已存在`);
      return;
    }
    startTransition(async () => {
      await createCategory(trimmed);
    });
    setNewCatName("");
    setCatError("");
    setShowCatInput(false);
  }

  const groups = initialCategories.map((cat) => ({
    cat,
    vocabs: initialVocabularies.filter((v) => v.categoryId === cat.id),
  }));

  const uncategorized = initialVocabularies.filter((v) => !v.categoryId);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">單字庫</h1>
        <Button onClick={() => setShowCatInput((s) => !s)}>+ 新增分類</Button>
      </div>

      {showCatInput && (
        <div className="flex flex-col gap-1.5">
          <form onSubmit={handleAddCategory} className="flex gap-2">
            <Input
              autoFocus
              className="flex-1"
              placeholder="分類名稱..."
              value={newCatName}
              onChange={(e) => {
                setNewCatName(e.target.value);
                if (catError) setCatError("");
              }}
              onKeyDown={(e) => e.key === "Escape" && setShowCatInput(false)}
            />
            <Button type="submit">建立</Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowCatInput(false);
                setNewCatName("");
                setCatError("");
              }}
            >
              取消
            </Button>
          </form>
          {catError && <p className="text-destructive text-sm">{catError}</p>}
        </div>
      )}

      {initialCategories.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-4xl mb-3">📂</p>
          <p className="font-medium">先新增分類，再加入單字</p>
          <p className="text-sm mt-1">點右上角「+ 新增分類」開始</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map(({ cat, vocabs }) => (
            <CategorySection
              key={cat.id}
              cat={cat}
              name={cat.name}
              vocabs={vocabs}
              categories={initialCategories}
              onDelete={handleDelete}
              onDeleteCategory={handleDeleteCategory}
            />
          ))}
          {uncategorized.length > 0 && (
            <CategorySection
              name="未分類"
              vocabs={uncategorized}
              categories={initialCategories}
              onDelete={handleDelete}
            />
          )}
        </div>
      )}

      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確認刪除</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete?.type === "vocab"
                ? `確定刪除「${pendingDelete.name}」？此操作無法復原。`
                : `確定刪除分類「${pendingDelete?.name}」？屬於此分類的單字將變為未分類。`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              刪除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
```

**Step 2: Replace app/vocabulary/page.tsx**

```tsx
// app/vocabulary/page.tsx
import { getCategories } from "@/lib/actions/categories";
import { getVocabularies } from "@/lib/actions/vocabulary";
import VocabularyClient from "./VocabularyClient";

export default async function VocabularyPage() {
  const [categories, vocabularies] = await Promise.all([
    getCategories(),
    getVocabularies(),
  ]);

  return (
    <VocabularyClient
      initialCategories={categories}
      initialVocabularies={vocabularies}
    />
  );
}
```

**Step 3: Update VocabCard to not use Zustand**

Check `components/VocabCard.tsx` — it likely uses `useVocabStore`. If so, update it to accept `onDelete` as a prop (it already does based on the current page, so it may already be clean). Read the file and fix if needed.

**Step 4: Commit**

```bash
git add app/vocabulary/page.tsx app/vocabulary/VocabularyClient.tsx
git commit -m "feat: migrate vocabulary page to server component + server actions"
```

---

## Task 12: Migrate vocabulary/new/page.tsx

**Files:**
- Modify: `app/vocabulary/new/page.tsx`

**Step 1: Replace app/vocabulary/new/page.tsx**

```tsx
// app/vocabulary/new/page.tsx
import { Suspense } from "react";
import NewVocabPageInner from "./NewVocabPageInner";

export default function NewVocabPage() {
  return (
    <Suspense fallback={null}>
      <NewVocabPageInner />
    </Suspense>
  );
}
```

**Step 2: Create app/vocabulary/new/NewVocabPageInner.tsx**

```tsx
// app/vocabulary/new/NewVocabPageInner.tsx
import { redirect } from "next/navigation";
import { getCategories } from "@/lib/actions/categories";
import { createVocabulary } from "@/lib/actions/vocabulary";
import NewVocabClient from "./NewVocabClient";

export default async function NewVocabPageInner() {
  const categories = await getCategories();
  return <NewVocabClient categories={categories} />;
}
```

**Step 3: Create app/vocabulary/new/NewVocabClient.tsx**

```tsx
// app/vocabulary/new/NewVocabClient.tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import VocabForm from "@/components/VocabForm";
import { createCategory } from "@/lib/actions/categories";
import { createVocabulary } from "@/lib/actions/vocabulary";
import type { Category } from "@/lib/db/schema";
import type { VocabFormData } from "@/lib/types";

export default function NewVocabClient({
  categories: initialCategories,
}: {
  categories: Category[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryId = searchParams.get("categoryId");
  const [vocabError, setVocabError] = useState("");
  const [categories, setCategories] = useState(initialCategories);

  const category = categories.find((c) => c.id === categoryId);

  async function handleSubmit(data: VocabFormData) {
    setVocabError("");
    try {
      await createVocabulary({
        japanese: data.japanese,
        chinese: data.chinese,
        exampleJp: data.exampleJp,
        categoryId: category ? category.id : null,
      });
      router.push("/vocabulary");
    } catch {
      setVocabError("新增失敗，請再試一次");
    }
  }

  async function handleCreateCategory(name: string) {
    const created = await createCategory(name);
    setCategories((prev) => [...prev, created]);
    return created;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">新增單字</h1>
        <p className="text-stone-500 text-sm mt-1">
          {category
            ? `加入「${category.name}」分類`
            : "加入新的單字到你的單字庫"}
        </p>
      </div>
      <div className="bg-card rounded-2xl border border-border p-6">
        {vocabError && (
          <p className="text-destructive text-sm mb-4">{vocabError}</p>
        )}
        <VocabForm
          categories={categories}
          onSubmit={handleSubmit}
          onCreateCategory={handleCreateCategory}
          submitLabel="新增單字"
        />
      </div>
    </div>
  );
}
```

**Step 4: Commit**

```bash
git add app/vocabulary/new/
git commit -m "feat: migrate vocabulary/new page to server actions"
```

---

## Task 13: Migrate vocabulary/[id]/page.tsx

**Files:**
- Modify: `app/vocabulary/[id]/page.tsx`

**Step 1: Replace app/vocabulary/[id]/page.tsx**

```tsx
// app/vocabulary/[id]/page.tsx
import { notFound } from "next/navigation";
import { eq, and } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { vocabulary } from "@/lib/db/schema";
import { getCategories } from "@/lib/actions/categories";
import EditVocabClient from "./EditVocabClient";

export default async function EditVocabPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const userId = session!.user.id;

  const [vocab, categories] = await Promise.all([
    db
      .select()
      .from(vocabulary)
      .where(and(eq(vocabulary.id, id), eq(vocabulary.userId, userId)))
      .then((rows) => rows[0]),
    getCategories(),
  ]);

  if (!vocab) notFound();

  return <EditVocabClient vocab={vocab} categories={categories} />;
}
```

**Step 2: Create app/vocabulary/[id]/EditVocabClient.tsx**

```tsx
// app/vocabulary/[id]/EditVocabClient.tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import VocabForm from "@/components/VocabForm";
import { createCategory } from "@/lib/actions/categories";
import { updateVocabulary, deleteVocabulary } from "@/lib/actions/vocabulary";
import type { Category, Vocabulary } from "@/lib/db/schema";
import type { VocabFormData } from "@/lib/types";

export default function EditVocabClient({
  vocab,
  categories: initialCategories,
}: {
  vocab: Vocabulary;
  categories: Category[];
}) {
  const router = useRouter();
  const [vocabError, setVocabError] = useState("");
  const [categories, setCategories] = useState(initialCategories);

  async function handleSubmit(data: VocabFormData) {
    setVocabError("");
    try {
      await updateVocabulary(vocab.id, {
        japanese: data.japanese,
        chinese: data.chinese,
        exampleJp: data.exampleJp,
        categoryId: data.categoryId,
      });
      router.push("/vocabulary");
    } catch {
      setVocabError("儲存失敗，請再試一次");
    }
  }

  async function handleDelete() {
    await deleteVocabulary(vocab.id);
    router.push("/vocabulary");
  }

  async function handleCreateCategory(name: string) {
    const created = await createCategory(name);
    setCategories((prev) => [...prev, created]);
    return created;
  }

  // Map DB Vocabulary to VocabFormData
  const initialData: VocabFormData & { id: string } = {
    id: vocab.id,
    japanese: vocab.japanese,
    chinese: vocab.chinese,
    exampleJp: vocab.exampleJp,
    categoryId: vocab.categoryId,
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">編輯單字</h1>
          <p className="text-muted-foreground text-sm mt-1">
            修改 {vocab.japanese} 的資料
          </p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm">
              刪除單字
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>確認刪除</AlertDialogTitle>
              <AlertDialogDescription>
                確定刪除「{vocab.japanese}」？此操作無法復原。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-white hover:bg-destructive/90"
              >
                刪除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      <div className="bg-card rounded-2xl border border-border p-6">
        {vocabError && (
          <p className="text-destructive text-sm mb-4">{vocabError}</p>
        )}
        <VocabForm
          categories={categories}
          initialData={initialData}
          onSubmit={handleSubmit}
          onCreateCategory={handleCreateCategory}
          submitLabel="儲存變更"
          showCategorySelector
        />
      </div>
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add app/vocabulary/[id]/
git commit -m "feat: migrate vocabulary edit page to server actions"
```

---

## Task 14: Migrate Review Page

**Files:**
- Modify: `app/review/page.tsx`

**Step 1: Replace app/review/page.tsx**

```tsx
// app/review/page.tsx
import { getTodayReviews } from "@/lib/actions/vocabulary";
import ReviewClient from "./ReviewClient";

export default async function ReviewPage() {
  const queue = await getTodayReviews();
  return <ReviewClient queue={queue} />;
}
```

**Step 2: Create app/review/ReviewClient.tsx**

```tsx
// app/review/ReviewClient.tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import FlashCard from "@/components/FlashCard";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { markReview } from "@/lib/actions/vocabulary";
import type { Vocabulary } from "@/lib/db/schema";

export default function ReviewClient({ queue }: { queue: Vocabulary[] }) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState({ remembered: 0, forgot: 0 });
  const [done, setDone] = useState(false);

  const current = queue[index];
  const total = queue.length;

  async function handleAnswer(remembered: boolean) {
    await markReview(current.id, remembered);
    setResults((r) => ({
      remembered: r.remembered + (remembered ? 1 : 0),
      forgot: r.forgot + (remembered ? 0 : 1),
    }));
    if (index + 1 >= total) {
      setDone(true);
    } else {
      setIndex((i) => i + 1);
    }
  }

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <p className="text-5xl">🎉</p>
        <h2 className="text-xl font-bold text-foreground">今日沒有待複習單字</h2>
        <Button variant="link" className="text-primary" onClick={() => router.push("/")}>
          回到首頁
        </Button>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-6 text-center">
        <p className="text-5xl">✅</p>
        <h2 className="text-2xl font-bold text-foreground">複習完成！</h2>
        <div className="flex gap-6">
          <div className="flex flex-col items-center">
            <span className="text-3xl font-bold text-emerald-600">{results.remembered}</span>
            <span className="text-sm text-muted-foreground">記得</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-3xl font-bold text-red-500">{results.forgot}</span>
            <span className="text-sm text-muted-foreground">忘記</span>
          </div>
        </div>
        <Button className="px-8" onClick={() => router.push("/")}>
          回到首頁
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-8">
      <div className="w-full flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-sm text-muted-foreground">進度</span>
          <span className="font-bold text-foreground">{index + 1} / {total}</span>
        </div>
        <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => router.push("/")}>
          離開
        </Button>
      </div>
      <Progress value={(index / total) * 100} className="w-full" />
      <FlashCard
        key={current.id}
        vocab={current}
        onRemembered={() => handleAnswer(true)}
        onForgot={() => handleAnswer(false)}
      />
    </div>
  );
}
```

**Note:** `FlashCard` currently accepts a `Vocabulary` from `lib/types.ts`. After migration, `Vocabulary` comes from `lib/db/schema.ts`. The fields are compatible but types differ (`reviewStage` is `number` in DB vs `0|1|2|3|4|5` in the old type, `nextReviewAt` is `Date` vs `number`). Update `FlashCard` imports and any type assertions as needed.

**Step 3: Commit**

```bash
git add app/review/
git commit -m "feat: migrate review page to server actions"
```

---

## Task 15: Migrate Homepage

**Files:**
- Modify: `app/page.tsx`
- Modify: `components/CategoryBar.tsx`

**Step 1: Replace app/page.tsx**

```tsx
// app/page.tsx
import Link from "next/link";
import CategoryBar from "@/components/CategoryBar";
import StatsCard from "@/components/StatsCard";
import { Button } from "@/components/ui/button";
import { getCategories } from "@/lib/actions/categories";
import { getVocabularies, getTodayReviews } from "@/lib/actions/vocabulary";

export default async function DashboardPage() {
  const [vocabularies, todayReviews, categories] = await Promise.all([
    getVocabularies(),
    getTodayReviews(),
    getCategories(),
  ]);

  const graduated = vocabularies.filter((v) => v.reviewStage === 5).length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">今日複習</h1>
        <p className="text-muted-foreground text-sm mt-1">保持每日練習，記憶更牢固</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatsCard label="待複習" value={todayReviews.length} highlight />
        <StatsCard label="總單字" value={vocabularies.length} />
        <StatsCard label="已畢業" value={graduated} />
      </div>

      {todayReviews.length > 0 ? (
        <Button size="lg" className="w-full text-lg py-7" asChild>
          <Link href="/review">開始複習（{todayReviews.length} 個）</Link>
        </Button>
      ) : (
        <Button size="lg" className="w-full text-lg py-7" disabled>
          今日無待複習單字
        </Button>
      )}

      <CategoryBar categories={categories} vocabularies={vocabularies} />
    </div>
  );
}
```

**Step 2: Update components/CategoryBar.tsx to accept props**

```tsx
// components/CategoryBar.tsx
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { Category, Vocabulary } from "@/lib/db/schema";

export default function CategoryBar({
  categories,
  vocabularies,
}: {
  categories: Category[];
  vocabularies: Vocabulary[];
}) {
  if (categories.length === 0) return null;

  return (
    <Card>
      <CardContent className="p-5">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
          分類進度
        </h2>
        <div className="flex flex-col gap-3">
          {categories.map((cat) => {
            const catVocabs = vocabularies.filter((v) => v.categoryId === cat.id);
            const graduated = catVocabs.filter((v) => v.reviewStage === 5).length;
            const total = catVocabs.length;
            const pct = total === 0 ? 0 : Math.round((graduated / total) * 100);

            return (
              <div key={cat.id}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="font-medium text-foreground">{cat.name}</span>
                  <span className="text-muted-foreground">{graduated}/{total}</span>
                </div>
                <Progress value={pct} className="h-2" />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
```

**Step 3: Commit**

```bash
git add app/page.tsx components/CategoryBar.tsx
git commit -m "feat: migrate homepage and CategoryBar to server component + server actions"
```

---

## Task 16: Update Navbar with Sign-Out Button

**Files:**
- Modify: `components/Navbar.tsx`

**Step 1: Replace components/Navbar.tsx**

```tsx
// components/Navbar.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";

const links = [
  { href: "/", label: "首頁" },
  { href: "/vocabulary", label: "單字庫" },
];

export default function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  if (pathname === "/login") return null;

  return (
    <nav className="border-b border-border bg-card sticky top-0 z-10">
      <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="font-bold text-foreground text-lg tracking-wide">
          📚 VocabFlow
        </Link>
        <div className="flex items-center gap-1">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                pathname === href
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {label}
            </Link>
          ))}
          {session?.user && (
            <div className="flex items-center gap-2 ml-2">
              {session.user.image && (
                <Image
                  src={session.user.image}
                  alt={session.user.name ?? "用戶"}
                  width={28}
                  height={28}
                  className="rounded-full"
                />
              )}
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground text-xs"
                onClick={() => signOut({ redirectTo: "/login" })}
              >
                登出
              </Button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
```

**Step 2: Wrap app in SessionProvider**

`useSession` requires a `SessionProvider`. Update `app/layout.tsx`:

```tsx
// app/layout.tsx
import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import Navbar from "@/components/Navbar";
import "./globals.css";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "VocabFlow — 單字練習本",
  description: "使用間隔重複法練習單字",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW">
      <body className={`${geist.className} bg-stone-50 min-h-screen`}>
        <SessionProvider>
          <Navbar />
          <main className="max-w-3xl mx-auto px-4 py-8">{children}</main>
        </SessionProvider>
      </body>
    </html>
  );
}
```

**Step 3: Commit**

```bash
git add components/Navbar.tsx app/layout.tsx
git commit -m "feat: update Navbar with sign-out button and VocabFlow branding"
```

---

## Task 17: Fix FlashCard and VocabCard Type Compatibility

**Files:**
- Modify: `components/FlashCard.tsx`
- Modify: `components/VocabCard.tsx`

These components currently use `Vocabulary` from `lib/types.ts`. After migration, they receive `Vocabulary` from `lib/db/schema.ts` which has different field types (`Date` vs `number` for timestamps, `number` for reviewStage).

**Step 1: Read both component files**

```bash
cat components/FlashCard.tsx
cat components/VocabCard.tsx
```

**Step 2: Update imports in each component**

Replace `import type { Vocabulary } from "@/lib/types"` with `import type { Vocabulary } from "@/lib/db/schema"`.

Fix any type errors:
- `reviewStage` is `number` (not `0|1|2|3|4|5`)
- `nextReviewAt` is `Date` (not `number`)
- `createdAt` is `Date` (not `number`)

Adjust any code that treats these as `number` to use `Date` methods instead (e.g., `.getTime()` if needed).

**Step 3: Run TypeScript check**

```bash
npx tsc --noEmit
```

Fix all remaining errors.

**Step 4: Commit**

```bash
git add components/FlashCard.tsx components/VocabCard.tsx
git commit -m "refactor: update FlashCard and VocabCard to use DB schema types"
```

---

## Task 18: Remove Zustand Store

**Files:**
- Delete: `lib/store.ts`
- Modify: `lib/types.ts` (optional cleanup)

**Step 1: Verify no remaining imports of lib/store.ts**

```bash
grep -r "from.*lib/store" --include="*.ts" --include="*.tsx" .
```

Expected: no output. If any files still import from `lib/store`, fix them before deleting.

**Step 2: Delete lib/store.ts**

```bash
rm lib/store.ts
```

**Step 3: Uninstall zustand (optional)**

```bash
npm uninstall zustand
```

**Step 4: Final TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

**Step 5: Final build check**

```bash
npm run build
```

Expected: build succeeds with no errors.

**Step 6: Commit**

```bash
git add -A
git commit -m "chore: remove zustand store after migration to server actions"
```

---

## Task 19: End-to-End Manual Verification

Test the complete auth + data flow:

1. `npm run dev`
2. Visit `http://localhost:3000` → should redirect to `/login`
3. Click "使用 Google 帳號登入" → Google OAuth flow → lands on homepage
4. Navbar shows user avatar and "登出" button
5. Create a category at `/vocabulary` → persists in Neon (verify with Drizzle Studio: `npx drizzle-kit studio`)
6. Add a vocabulary word → persists in Neon
7. Visit `/review` → shows today's review queue
8. Click "登出" → redirects to `/login`
9. Sign in again → same data is restored from Neon
10. Open a private/incognito window → redirects to `/login`

If Google OAuth redirect URI error: add `http://localhost:3000/api/auth/callback/google` to the Google Console authorized redirect URIs.

---

## Notes

- `lib/types.ts` (`VocabFormData`) is kept for `VocabForm` compatibility. After all pages are fully migrated and tested, it can be replaced with types from `lib/db/schema.ts` in a follow-up cleanup PR.
- The `markReview` action updates the DB synchronously per card flip. For production with many users, consider batching — but YAGNI for now.
- Neon's free tier has 0.5 GB storage and auto-suspends after 5 min inactivity (cold start ~1-2s). Acceptable for a personal app.
