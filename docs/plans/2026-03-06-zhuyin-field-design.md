# 設計文件：中文注音欄位

## 背景

僅針對中文語言（`ttsCode === "zh-TW"`）的模組：
- 新增／編輯頁面移除「例句」欄位，改為「注音」欄位
- 批次新增單字格式改為：`母語 | 目標語言 | 注音（選填）`

其他語言（日文、英文等）的例句欄位保持不變。

## 判斷條件

`language.ttsCode === "zh-TW"` → 顯示注音欄位

## 變更清單

### 1. DB Migration
新增 `zhuyin` 欄位至 `vocabulary` 表：
- 型別：`text`，not null，default `""`
- 保留既有 `example_jp` 欄位（其他語言繼續使用）

### 2. `lib/db/schema.ts`
新增 `zhuyin: text("zhuyin").notNull().default("")`

### 3. `lib/types.ts`
`VocabFormData` 與 `Vocabulary` 介面新增 `zhuyin: string`

### 4. `lib/actions/vocabulary.ts`
`createVocabulary`、`updateVocabulary`、`createVocabularies` 支援 `zhuyin` 欄位

### 5. `components/VocabForm.tsx`
新增 `isChineseLanguage?: boolean` prop：
- `true`：顯示「注音」欄位，隱藏「例句」欄位
- `false`（預設）：顯示「例句」欄位

### 6. `components/FlashCard.tsx`
- `vocab.zhuyin` 有值時顯示注音
- `vocab.exampleJp` 有值時顯示例句（兩者互不衝突）

### 7. `app/languages/[id]/LanguageClient.tsx`
- `parseBatchVocabLine` 根據語言決定第三欄解析為 `zhuyin` 或 `exampleJp`
- 中文分類 Dialog 說明文字：`每行一筆：母語 | 目標語言 | 注音（選填）`

### 8. `NewVocabClient` 與 `EditVocabClient`
傳入 `isChineseLanguage` 給 `VocabForm`
