# 設計文件：分類刪除連帶刪除單字 & 編輯分類名稱

## 功能 1：刪除分類時一併刪除底下所有單字

**現況：** `vocabulary.categoryId` 的 `onDelete: "set null"`，刪除分類後單字變未分類。

**變更：**
- `lib/db/schema.ts`：`onDelete: "set null"` → `onDelete: "cascade"`
- 執行 Drizzle DB migration
- `app/languages/[id]/LanguageClient.tsx` 確認 dialog 文字更新

## 功能 2：編輯分類名稱

**新增 server action：** `updateCategory(id: string, name: string, languageId: string)`

**UI：** CategorySection header 新增編輯按鈕，點擊後切換為 inline 輸入框（預填現有名稱）。Enter 或 ✓ 確認，Esc 或 ✕ 取消。
