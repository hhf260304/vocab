# 句子分類練習模式

**日期：** 2026-05-29

## 背景

句子分類內頁目前只有新增 / 編輯 / 刪除功能。使用者希望能在分類內頁直接進入「練習該分類全部句子」的模式，不受 SRS 排程限制，純本地翻牌練習。

## 需求

- 分類內頁標題列新增「複習」按鈕，分類無句子時 disabled
- 點擊後進入練習頁，顯示該分類**全部**句子（不篩選到期日）
- 記得 / 忘記操作**不寫入資料庫**，純本地 session state
- 可多輪複習（每輪只剩忘記的句子）
- 練習結束或離開後回到該分類內頁

## 不在範圍

- SRS 更新
- 刪除句子（練習模式無破壞性操作）
- 與現有 `/sentences/[languageId]/review` SRS 複習流程有任何耦合

---

## 架構

### 新增檔案

#### `app/languages/[id]/sentences/[categoryId]/review/page.tsx`

Server Component。

```
params: { id: string; categoryId: string }
```

並行取：
- `getLanguageById(id)`
- `getCategories(id, "sentence")`（用於解析 categoryName）
- `getSentences(id, categoryId)`（全部句子）

若 language 或 categoryName 不存在 → `notFound()`

渲染 `<SentencePracticeClient sentences={...} language={...} categoryName={...} />`

---

#### `app/languages/[id]/sentences/[categoryId]/review/SentencePracticeClient.tsx`

Client Component，props：

```ts
{
  sentences: Sentence[];
  language: Language;
  categoryName: string;
}
```

**session 邏輯**（與 SentenceReviewClient 一致，但無 DB 寫入）：

- 進入時洗牌 sentences
- `handleAnswer(remembered: boolean)`：純本地更新 `failedIds`、`forgottenThisRound`、`roundRemembered`
- `startNextRound()`：以 forgottenThisRound 開始下一輪
- 結果頁「完成」→ `router.push(/languages/${language.id}/sentences/${categoryId})`
- 「離開」按鈕 → 同上

**UI 差異（相比 SentenceReviewClient）**：
- 移除刪除句子按鈕
- Header 顯示「[language.name] · 練習」及分類名稱，而非「語言 · 句子」
- 空句子（sentences.length === 0）頁面顯示「這個分類還沒有句子」並提供回到分類內頁的連結

---

### 修改現有檔案

#### `app/languages/[id]/sentences/[categoryId]/SentenceCategoryClient.tsx`

在標題列按鈕列新增「複習」按鈕：

- icon：`BookOpen`（lucide-react）
- 樣式：`variant="outline"` + 綠色邊框，與現有綠色主題一致
- `disabled={sentences.length === 0}`
- `onClick`：`router.push(/languages/${language.id}/sentences/${categoryId}/review)`

按鈕順序（左→右）：複習 ｜ 批次新增 ｜ 新增句子

---

## 資料流

```
SentenceCategoryClient
  → router.push(/languages/[id]/sentences/[categoryId]/review)
      → page.tsx (server): getSentences(id, categoryId) → all sentences
          → SentencePracticeClient (client): local session only
              → router.push(/languages/[id]/sentences/[categoryId])
```

`getSentences` 已存在且支援 categoryId，無需新增 action。

---

## 邊界情況

| 情況 | 處理 |
|------|------|
| 分類無句子 | 按鈕 disabled（無法進入）；若直接訪問 URL，顯示「此分類無句子」畫面 |
| 只有一個句子 | 正常運作，完成後顯示結果頁 |
| uncategorized | `categoryId = "uncategorized"`，`getSentences` 已支援此值 |
