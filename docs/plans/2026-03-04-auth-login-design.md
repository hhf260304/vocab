# 設計文件：Google 登入與後端資料儲存

**日期：** 2026-03-04
**狀態：** 已核准

## 概述

為 VocabFlow（單字練習本）實作 Google OAuth 登入，並將用戶資料從 Zustand client-side state 遷移至 Neon PostgreSQL 後端，實現每個 Google 帳號獨立儲存資料。

## Tech Stack

| 元件 | 選擇 | 理由 |
|------|------|------|
| Auth | Auth.js v5 (`next-auth@beta`) | 與 Next.js App Router 整合最深，支援 Google OAuth |
| Session | JWT（無 DB session 表） | 個人 app 夠用，設定簡單 |
| 資料庫 | Neon PostgreSQL (Serverless) | 與 Next.js 部署整合順，免費 tier 夠用 |
| ORM | Drizzle ORM | 輕量、型別安全、與 Neon 相性佳 |

## 架構

### 新增檔案

```
auth.ts                              # Auth.js 設定（Google provider + JWT）
middleware.ts                        # 全站路由保護
app/(auth)/login/page.tsx            # 登入頁面
app/api/auth/[...nextauth]/route.ts  # Auth.js API handler
lib/db/index.ts                      # Drizzle client
lib/db/schema.ts                     # DB schema 定義
lib/actions/categories.ts            # Server actions（分類 CRUD）
lib/actions/vocabulary.ts            # Server actions（單字 CRUD）
```

### Auth 流程

```
用戶訪問任何頁面
  → middleware 檢查 JWT cookie
  → 未登入 → redirect /login
  → 已登入在 /login → redirect /vocabulary

/login 頁面
  → 點「使用 Google 帳號登入」按鈕
  → Google OAuth callback（/api/auth/callback/google）
  → Auth.js 建立/找到 user 記錄於 DB
  → 設定 JWT cookie → redirect /vocabulary
```

### Middleware 規則

- **保護：** 所有路由（`/`、`/vocabulary`、`/review/**` 等）
- **例外：** `/login`、`/api/auth/**`
- 未登入 → redirect `/login`
- 已登入訪問 `/login` → redirect `/vocabulary`

## 資料庫 Schema

```sql
users
  id         text PRIMARY KEY          -- 來自 Auth.js（Google sub）
  email      text UNIQUE NOT NULL
  name       text
  image      text
  createdAt  timestamp DEFAULT now()

categories
  id         text PRIMARY KEY          -- cuid
  userId     text REFERENCES users(id) ON DELETE CASCADE
  name       text NOT NULL
  createdAt  timestamp DEFAULT now()

vocabulary
  id         text PRIMARY KEY          -- cuid
  userId     text REFERENCES users(id) ON DELETE CASCADE
  categoryId text REFERENCES categories(id) ON DELETE SET NULL  -- nullable
  word       text NOT NULL             -- 單字
  reading    text                      -- 讀音（平假名等）
  meaning    text NOT NULL             -- 意思
  createdAt  timestamp DEFAULT now()
```

**設計重點：**
- `userId` 直接掛在每個資料表（扁平結構，查詢簡單）
- `categoryId` nullable — 單字可不屬於任何分類
- 刪除 user cascade delete 所有相關資料

## 資料存取：Server Actions 取代 Zustand

每個 Server Action 內部：
1. 從 Auth.js session 取得 `userId`
2. 所有 DB query 帶 `where userId = ...`（用戶只能存取自己的資料）
3. 回傳資料給 Client Component

Zustand 的 vocabulary/categories store 移除，改用 Server Actions + `useState`/`useOptimistic`。

## 登入頁面 UI

```
┌─────────────────────────────────┐
│                                 │
│           📚 VocabFlow           │
│            單字練習本            │
│                                 │
│  ┌───────────────────────────┐  │
│  │  G  使用 Google 帳號登入  │  │
│  └───────────────────────────┘  │
│                                 │
└─────────────────────────────────┘
```

- 使用現有 shadcn/ui `Button` 元件
- 背景沿用現有 warm stone 配色
- 登入中顯示 loading spinner
- 系統文字全中文

## 資料遷移策略

現有 Zustand 資料為 ephemeral（記憶體），不需要遷移腳本。用戶登入後從空白開始建立資料。
