# Credentials Auth Design

**Date:** 2026-03-04
**Feature:** Username + Password Login & Registration

## Goal

Add username/password auth alongside existing Google OAuth on the login page.

## Decisions

- Account identifier: **username** (not email)
- Google OAuth and credentials auth **coexist**
- Both options displayed together on the login page (no toggle)

## Schema Changes

Modify `users` table:
- `email` → nullable (credentials users have no email)
- Add `username text UNIQUE` — credentials users' unique identifier
- Add `passwordHash text` — bcrypt hash; null for Google users

## Auth Flow

### Registration
1. Validate: username not empty, unique; password ≥ 6 chars
2. Hash password with `bcryptjs`
3. Insert into `users` (id = randomUUID, email = null)
4. Call `signIn("credentials", ...)` to auto-login

### Login (NextAuth Credentials Provider)
1. Receive username + password
2. Query `users` by username
3. `bcrypt.compare` password against hash
4. Return user object → NextAuth creates JWT session

## UI Layout

```
[📚 VocabFlow]
[單字練習本]

[tabs: 登入 | 註冊]
  username input
  password input
  [登入 / 註冊 button]

─────── 或 ───────

[G] 使用 Google 帳號登入
```

## Implementation Steps

1. Install `bcryptjs` and `@types/bcryptjs`
2. Add Drizzle migration: `username`, `passwordHash` columns; `email` nullable
3. Add `Credentials` provider to `auth.ts`
4. Create `lib/actions/auth.ts` with `register` server action
5. Build `LoginForm` client component (tabs: login/register)
6. Update `app/(auth)/login/page.tsx` to include LoginForm + Google button
