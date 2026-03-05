# 多語言單字學習系統設計

## 概覽

將現有的日中文單字學習應用泛化為支援多語言的單字複習平台。各語言之間的複習互相獨立，畫面以語言為主軸進行組織。

## 功能範圍

### 1. 新增單字表單欄位泛化

- 欄位標籤從「日文 / 中文意思 / 例句（日文）」改為「正面 / 反面 / 例句」
- 正面：母語提示（靜音）
- 反面：目標語言單字（翻轉時自動 TTS 播音）

### 2. FlashCard 行為

- `defaultSide = front`：先顯示正面（母語）→ 翻轉 → 反面（目標語言）+ 自動播音
- `defaultSide = back`：先顯示反面（目標語言）+ 立即播音 → 翻轉 → 正面（母語，靜音）
- TTS 語言代碼來自語言設定的 `ttsCode`，只有反面欄位觸發播音

### 3. 語言管理

使用者可建立語言學習組，從預設清單選擇：

| 語言 | TTS 代碼 |
|------|----------|
| 中文 | zh-TW    |
| 英文 | en-US    |
| 日文 | ja-JP    |
| 韓文 | ko-KR    |

每個語言組有獨立的 `defaultSide` 設定（預設 `front`）。

### 4. 畫面流程

```
/ → 語言卡片列表（各語言顯示待複習數）
      ↓ 點擊
/languages/[id] → 語言主頁
      ├─ 統計卡片（待複習、總單字、已畢業）
      ├─ 開始複習按鈕 → /review/[languageId]
      ├─ 新增單字 → /vocabulary/new?languageId=xxx
      └─ 查看全部單字 → /vocabulary?languageId=xxx

/review/[languageId] → 只複習該語言的到期單字
/vocabulary?languageId=xxx → 該語言的單字列表
/vocabulary/new?languageId=xxx → 新增單字（含語言選擇器）
```

## 資料庫設計

### 新增 `languages` 表

```sql
CREATE TABLE languages (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  tts_code    TEXT NOT NULL,
  default_side TEXT NOT NULL DEFAULT 'front',  -- 'front' | 'back'
  created_at  TIMESTAMP NOT NULL DEFAULT now()
);
```

### 修改 `vocabulary` 表

- `japanese` 欄位重新命名為 `front`
- `chinese` 欄位重新命名為 `back`
- 新增 `language_id` 欄位（外鍵參考 `languages`，允許 null 以利舊資料相容）

```sql
ALTER TABLE vocabulary RENAME COLUMN japanese TO front;
ALTER TABLE vocabulary RENAME COLUMN chinese TO back;
ALTER TABLE vocabulary ADD COLUMN language_id TEXT REFERENCES languages(id) ON DELETE SET NULL;
```

### Drizzle Schema 更新

```typescript
export const languages = pgTable("languages", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  ttsCode: text("tts_code").notNull(),
  defaultSide: text("default_side").notNull().default("front"),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
});

// vocabulary 表欄位更新
front: text("front").notNull(),       // 原 japanese
back: text("back").notNull(),         // 原 chinese
languageId: text("language_id").references(() => languages.id, { onDelete: "set null" }),
```

## 元件影響

### 修改的元件

- `VocabForm` — 欄位標籤改為正面/反面/例句，加入語言選擇器
- `FlashCard` — 接受 `ttsCode` 和 `defaultSide` props，TTS 只在反面觸發
- `ReviewClient` — 接收語言資訊，傳入 FlashCard
- `app/page.tsx` — 改為語言卡片首頁
- `app/review/page.tsx` → `app/review/[languageId]/page.tsx`

### 新增的元件/頁面

- `app/languages/[id]/page.tsx` — 語言主頁
- `app/languages/[id]/LanguageClient.tsx`
- `lib/actions/languages.ts` — CRUD server actions
- `components/LanguageCard.tsx` — 首頁語言卡片

## 遷移策略

1. 執行 DB migration（新增 languages 表、修改 vocabulary 欄位）
2. 舊資料（`languageId = null`）在 UI 上歸入「未分類」或引導用戶指定語言
3. 現有的 `categoryId` 欄位保留不動，categories 功能繼續在語言組內運作
