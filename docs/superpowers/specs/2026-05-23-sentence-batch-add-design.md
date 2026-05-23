# 句子分類內頁批次新增功能設計

**日期：** 2026-05-23  
**範圍：** `app/languages/[id]/sentences/[categoryId]/` 分類內頁

---

## 目標

在句子管理的分類內頁加入批次新增功能，讓使用者能一次貼入多筆句子與翻譯，邏輯與 UI 風格與單字批次新增保持一致。

---

## 解析邏輯

函式：`parseBatchSentenceLine(line: string)`

- 自動判斷分隔符：先檢查是否含 `\t`，有則以 Tab 切割，否則以 `|` 切割
- 取前兩欄：`front`（句子）、`back`（翻譯）
- `front` 或 `back` 任一為空 → 回傳 `null`（標記錯誤行）
- 無第三欄（句子不需例句/注音）

格式範例：
```
I love cats | 我愛貓
She runs fast | 她跑得很快
```

---

## Server Action

新增 `createSentences` 於 `lib/actions/sentences.ts`

```ts
export async function createSentences(
  items: { front: string; back: string }[],
  languageId: string,
  categoryId: string | null
): Promise<{ created: number }>
```

- 批次 `db.insert(sentences).values(...)` 一次寫入
- 每筆設 `reviewStage: 0`、`nextReviewAt: new Date()`
- 成功後 `revalidatePath("/")` 與 `revalidatePath("/languages/${languageId}", "layout")`

---

## UI 變更（SentenceCategoryClient.tsx）

### 新增狀態
```ts
const [batchOpen, setBatchOpen] = useState(false);
const [batchText, setBatchText] = useState("");
const [batchErrors, setBatchErrors] = useState<number[]>([]);
const [isBatchSubmitting, setIsBatchSubmitting] = useState(false);
```

### 新增 handler
`handleBatchCreate`：
1. 逐行解析 `batchText`，收集錯誤行號
2. 有錯誤 → 顯示錯誤行，不送出
3. 無錯誤 → 呼叫 `createSentences`，完成後 `router.refresh()`，關閉 Dialog

### 按鈕區
在「新增句子」按鈕左側加「批次新增」按鈕（`ListPlus` icon），與單字頁相同位置。

### Dialog
- 標題：`批次新增句子 — {categoryName}`
- 說明：`每行一筆：句子（語言） | 翻譯（母語）`
- Textarea rows=8，placeholder 示範兩行範例
- 錯誤時顯示錯誤行號列表
- 按鈕：取消 / 新增（loading 狀態顯示「新增中…」）

### router.refresh()
批次成功後使用 `router.refresh()` 重新載入，不手動 merge local state（與單字頁一致）。需引入 `useRouter`。

---

## 需修改的檔案

| 檔案 | 變更 |
|------|------|
| `lib/actions/sentences.ts` | 新增 `createSentences` action |
| `app/languages/[id]/sentences/[categoryId]/SentenceCategoryClient.tsx` | 加批次新增 UI、handler、import |
