# 設計文件：統計功能移入各自管理頁

**日期：** 2026-05-24  
**狀態：** 已核准

## 背景

目前語言總覽頁（`/languages/${id}`）頂端有一個「統計」按鈕，連到 `/languages/${id}/stats`，只顯示單字的錯誤排行榜。句子雖然有 `failCount` 欄位，但沒有對應統計頁面。

目標：把統計入口移到「單字管理」和「句子管理」各自的頁面頂端，讓功能各司其職。

## 路由變更

| 舊路由 | 新路由 | 備註 |
|---|---|---|
| `/languages/${id}/stats` | 刪除 | 舊頁面整個移除 |
| （無） | `/languages/${id}/vocabulary/stats` | 單字錯誤排行榜 |
| （無） | `/languages/${id}/sentences/stats` | 句子錯誤排行榜 |

## 各檔案變更

### `LanguageClient.tsx`
- 移除頂端的 `BarChart2` 統計按鈕及相關 import

### `VocabularyClient.tsx`
- 在頂端 back button 列的右側新增 `variant="outline"` 統計按鈕
- 連結：`/languages/${id}/vocabulary/stats`
- 圖示：`BarChart2`

### `SentencesClient.tsx`
- 同上，連結：`/languages/${id}/sentences/stats`

### `app/languages/[id]/vocabulary/stats/page.tsx`（新建）
- 內容與現有 `/languages/${id}/stats/page.tsx` 相同
- Back button 改連回 `/languages/${id}/vocabulary`
- 使用現有 `getFailStats(languageId)` action

### `app/languages/[id]/sentences/stats/page.tsx`（新建）
- 格式與單字統計相同（錯誤排行榜）
- Back button 連回 `/languages/${id}/sentences`
- 使用新 `getSentenceFailStats(languageId)` action

### `lib/actions/sentences.ts`（新增 action）
- 新增 `getSentenceFailStats(languageId: string)` 
- 查詢 `sentences` 表，依 `failCount DESC` 排序，只回傳 `failCount > 0` 的資料
- 回傳欄位：`id`, `front`, `back`, `categoryName`, `failCount`

### `app/languages/[id]/stats/page.tsx`（刪除）
- 整個舊統計頁刪除

## 不在範圍內

- 統計內容格式的變更（仍是錯誤排行榜）
- 新增其他統計指標
