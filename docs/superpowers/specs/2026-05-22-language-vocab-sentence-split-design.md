# 語言頁單字管理 / 句子管理分拆設計

**日期：** 2026-05-22  
**狀態：** 已核准

---

## 背景

目前 `/languages/[id]` 將單字統計、複習按鈕、句子複習按鈕、分類列表全部混在同一頁。隨著句子功能逐步完善，使用者需要獨立管理單字與句子，兩者應有各自清楚的入口與管理介面。

---

## 目標

- 進入語言後，明確看到「單字管理」與「句子管理」兩個區塊
- 句子管理頁支援分類功能（句子專屬分類，不與單字分類混用）
- 各管理頁包含自己的統計與複習按鈕

---

## 路由結構

| 路由 | 狀態 | 說明 |
|------|------|------|
| `/languages/[id]` | 改寫 | 語言入口頁，只顯示兩張入口卡片 |
| `/languages/[id]/vocabulary` | 新增 | 單字管理：統計、複習按鈕、分類列表 |
| `/languages/[id]/sentences` | 強化 | 句子管理：統計、複習按鈕、句子分類列表 |
| `/languages/[id]/sentences/[categoryId]` | 新增 | 某句子分類的句子 CRUD |

---

## 頁面設計

### ① `/languages/[id]` — 語言入口（改寫）

- 顯示語言名稱 + 統計按鈕（右上角，連結至 `/languages/[id]/stats`）
- 兩張彩色入口卡片，垂直排列：
  - **單字管理**：顯示總單字數、待複習數；點擊進入 `/languages/[id]/vocabulary`
  - **句子管理**：顯示總句子數、待複習數；點擊進入 `/languages/[id]/sentences`
- 主頁不再有任何統計格、複習按鈕或列表

### ② `/languages/[id]/vocabulary` — 單字管理（新路由）

- 返回按鈕 → `/languages/[id]`
- 統計格（三欄）：待複習 / 總單字 / 已畢業
- 「開始複習」主按鈕（待複習 > 0 才啟用）
- 工具列：「＋ 新增分類」、「＋ 新增單字」
- 單字分類卡片列表（含虛擬「未分類」）
- 功能與現有 `LanguageClient.tsx` 相同，僅移動位置

### ③ `/languages/[id]/sentences` — 句子管理（強化）

- 返回按鈕 → `/languages/[id]`
- 統計格（兩欄）：待複習 / 總句子
- 「複習句子」主按鈕（待複習 > 0 時啟用；無待複習時顯示為 disabled，與單字複習按鈕行為一致）
- 工具列：「＋ 新增分類」、「＋ 新增句子」（新增句子預設放入未分類）
- 句子分類卡片列表（含虛擬「未分類」），與單字分類卡片樣式一致

### ④ `/languages/[id]/sentences/[categoryId]` — 分類內句子（新）

- 返回按鈕 → `/languages/[id]/sentences`
- 標題：分類名稱 + 語言名稱 + 句子數
- 「＋ 新增句子」按鈕，新增時自動帶入當前分類
- 句子列表（front / back，可編輯、可刪除）
- 邏輯與現有 `SentencesClient.tsx` 相同，但限定在一個分類內
- `categoryId === 'uncategorized'` 為虛擬分類，查詢 `categoryId IS NULL` 的句子

---

## Schema 變動

`categories` 表新增一欄：

```sql
ALTER TABLE categories ADD COLUMN type text NOT NULL DEFAULT 'vocab';
```

- `type` 值：`'vocab'`（單字分類）或 `'sentence'`（句子分類）
- 現有資料預設 `'vocab'`，零影響
- `sentences.categoryId` 繼續參照 `categories.id`，但只會關聯 `type = 'sentence'` 的分類

---

## Actions 變動

### `lib/actions/categories.ts`

- `getCategories(languageId, type)` — 加 `type` 參數，預設 `'vocab'`
- `createCategory(name, languageId, type)` — 加 `type` 參數，預設 `'vocab'`
- `getCategoryVocabCounts(languageId)` — 不變（只查 vocab 分類）
- 新增 `getCategorySentenceCounts(languageId)` — 回傳各句子分類的句子數

### `lib/actions/sentences.ts`

- `getSentences(languageId, categoryId?)` — 加可選 `categoryId` 過濾
- `getTodaySentenceReviews(languageId)` — 不變
- `getSentenceCounts(languageId)` — 新增，回傳 `{ total, dueToday }`

### `lib/actions/languages.ts` / `vocabulary.ts`

- 不需變動

---

## 元件規劃

| 檔案 | 狀態 | 說明 |
|------|------|------|
| `app/languages/[id]/page.tsx` | 改寫 | 載入 vocab counts + sentence counts，傳給新 LanguageClient |
| `app/languages/[id]/LanguageClient.tsx` | 改寫 | 精簡為兩張入口卡片 |
| `app/languages/[id]/vocabulary/page.tsx` | 新增 | 載入 vocab 相關資料 |
| `app/languages/[id]/vocabulary/VocabularyClient.tsx` | 新增 | 從現有 LanguageClient 提取單字管理邏輯 |
| `app/languages/[id]/sentences/page.tsx` | 強化 | 加入 sentence counts + sentence categories 載入 |
| `app/languages/[id]/sentences/SentencesClient.tsx` | 強化 | 加入統計格、複習按鈕、分類卡片列表；移除平鋪句子列表 |
| `app/languages/[id]/sentences/[categoryId]/page.tsx` | 新增 | 載入分類句子 |
| `app/languages/[id]/sentences/[categoryId]/SentenceCategoryClient.tsx` | 新增 | 分類內句子 CRUD，邏輯類似現有 SentencesClient |

---

## 資料流

### 語言入口頁

```
page.tsx (server)
  ├── getLanguageById(id)
  ├── getVocabularyCounts(id)         → { total }
  ├── getTodayReviews(id)             → count
  ├── getSentenceCounts(id)           → { total }
  └── getTodaySentenceReviews(id)     → count
        ↓
LanguageClient.tsx (client) — 只渲染兩張入口卡片
```

### 單字管理頁

```
page.tsx (server)
  ├── getLanguageById(id)
  ├── getVocabularyCounts(id)         → { total, graduated }
  ├── getTodayReviews(id)             → count
  ├── getCategories(id, 'vocab')
  └── getCategoryVocabCounts(id)
        ↓
VocabularyClient.tsx (client)
```

### 句子管理頁

```
page.tsx (server)
  ├── getLanguageById(id)
  ├── getSentenceCounts(id)           → { total }
  ├── getTodaySentenceReviews(id)     → count
  ├── getCategories(id, 'sentence')
  └── getCategorySentenceCounts(id)
        ↓
SentencesClient.tsx (client)
```

### 句子分類頁

```
page.tsx (server)
  ├── getLanguageById(id)
  ├── getCategories(id, 'sentence')   → 找出當前分類名稱
  └── getSentences(id, categoryId)    → 該分類句子列表
        ↓
SentenceCategoryClient.tsx (client)
```

---

## 資料遷移注意事項

現有句子若已有 `categoryId`（指向 `type = 'vocab'` 的分類），改版後查詢句子分類時不會顯示該分類名稱（因為 `getCategories(id, 'sentence')` 只回傳 sentence 類型）。

處理方式：**不做資料遷移**，因為目前開發階段句子分類功能尚未正式上線，現有句子的 categoryId 幾乎都是 null 或開發測試資料。若日後有需要，可在 migration 中把有效的 sentence categoryId 對應的分類複製一份並設 `type = 'sentence'`。

---

## 不在此次範圍

- 單字分類頁（`/languages/[id]/categories/[categoryId]`）的結構不變
- 複習頁（`/review/[languageId]`、`/sentences/[languageId]/review`）不變
- 統計頁（`/languages/[id]/stats`）不變
- 批次新增單字功能不在此次範圍
