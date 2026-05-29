# 明天複習預覽功能設計

**日期：** 2026-05-29  
**狀態：** 待實作

## 背景

目前單字管理頁和句子管理頁只顯示「今日待複習」數量，使用者無法預知明天需要複習哪些內容。此功能讓使用者在單字/句子管理頁看到「明天待複習 X 個」的入口，點擊後進入專屬的唯讀預覽頁面，列出所有明天到期的項目。

## 範圍

- 單字管理頁加入明天複習入口
- 句子管理頁加入明天複習入口
- 各自對應一個新的預覽頁面（唯讀，不觸發 SRS）

## 資料層

### 新增 server action

**`lib/actions/vocabulary.ts`**

```ts
export async function getTomorrowVocabReviews(languageId: string)
```

**`lib/actions/sentences.ts`**

```ts
export async function getTomorrowSentenceReviews(languageId: string)
```

查詢條件：
- `userId = 當前用戶`
- `languageId = 指定語言`
- `reviewStage < 6`（未畢業）
- `nextReviewAt >= tomorrowStart`（明天零時，含）
- `nextReviewAt < dayAfterTomorrowStart`（後天零時，不含）

時間計算：以 server 當地時間 `new Date()` → `setHours(0,0,0,0)` → 加一天取得 `tomorrowStart`，再加一天取得 `dayAfterTomorrowStart`。

## 管理頁入口

### 單字管理頁

`app/languages/[id]/vocabulary/page.tsx` 新增呼叫 `getTomorrowVocabReviews`，取得 count 傳給 client component。

Client component 在「今日待複習」資訊下方加：

```
明天待複習 12 個 →
```

若 count = 0 則此行不顯示。

### 句子管理頁

`app/languages/[id]/sentences/page.tsx` 與 `SentencesClient.tsx` 同樣處理，連結指向 `/languages/[id]/sentences/tomorrow`。

## 預覽頁面

### 單字預覽

| 檔案 | 職責 |
|------|------|
| `app/languages/[id]/vocabulary/tomorrow/page.tsx` | Server component，呼叫 `getTomorrowVocabReviews`，傳資料與語言物件給 Client |
| `app/languages/[id]/vocabulary/tomorrow/TomorrowVocabClient.tsx` | Client component，純列表顯示 |

### 句子預覽

| 檔案 | 職責 |
|------|------|
| `app/languages/[id]/sentences/tomorrow/page.tsx` | Server component |
| `app/languages/[id]/sentences/tomorrow/TomorrowSentenceClient.tsx` | Client component，純列表顯示 |

## 預覽頁 UI

- **頁首**：`← 返回` 按鈕 + 標題「明天的複習預覽」+ 語言名稱 + 項目總數 badge
- **列表**：每筆一張卡片，front 與 back 同時顯示（不需翻牌）；依分類名稱分組，分組標題顯示分類名（未分類則顯示「未分類」）
- **空狀態**：明天無待複習項目時，顯示文案「明天沒有待複習的項目 🎉」
- **樣式**：單字預覽沿用藍紫色系（`primary`），句子預覽沿用綠色系（`emerald`）

## 不在範圍內

- 預覽頁不能執行複習（無「記得 / 忘記」按鈕）
- 不支援「後天」或其他日期預覽
- 不新增通知或排程提醒功能
