# 錯誤次數統計頁面 設計文件

**日期：** 2026-04-10

## 目標

在每個語言層級新增一個「錯誤排行榜」頁面，顯示該語言下按歷史累計錯誤次數由高到低排列的單字。

---

## 資料層

### Schema 變更

在 `vocabulary` 資料表新增欄位：

```sql
fail_count integer NOT NULL DEFAULT 0
```

對應 `lib/db/schema.ts` 中的 TypeScript 欄位名為 `failCount`。現有單字的 `failCount` 預設為 0（歷史資料從現在起開始計算）。

### Migration

使用 Drizzle Kit 產生並執行 migration（`npm run db:generate` + `npm run db:migrate`）。

### Server Action 變更

**修改 `markReview`（`lib/actions/vocabulary.ts`）：**
- 當 `remembered = false` 時，在 UPDATE 中同時執行 `failCount + 1`
- 目前 `ReviewClient.tsx` 只有在 `remembered = true` 時才呼叫 `markReview`，需要改成忘記時也呼叫（移除現有條件判斷，統一呼叫 `markReview`，讓 server action 本身處理 remembered/forgotten 邏輯）

**新增 `getFailStats(languageId: string)`：**
- 查詢條件：`userId`、`languageId`、`failCount > 0`
- 排序：`failCount DESC`
- Left join `categories` 取得 `categoryName`
- 回傳欄位：`id`, `front`, `back`, `failCount`, `categoryName`

---

## 頁面與 UI

### 路由

`/languages/[id]/stats` — server component page

### 入口

在 `LanguageClient.tsx` 的語言頁面加入「錯誤統計」連結按鈕，導向 `/languages/[id]/stats`。

### 頁面結構

```
[語言名稱] — 錯誤排行榜

[空狀態：若無錯誤紀錄，顯示「還沒有錯誤紀錄」]

排行榜清單（每行）：
  排名  |  front  |  back  |  [分類標籤]  |  [N 次] 紅色 badge

[返回 /languages/[id] 連結]
```

- 純 server component，不需要 client 互動
- 沿用現有 Tailwind CSS + shadcn/ui 元件風格
- 分類標籤若無分類則不顯示
- 錯誤次數以紅色 badge 強調

---

## 檔案影響範圍

| 檔案 | 變更類型 |
|------|---------|
| `lib/db/schema.ts` | 新增 `failCount` 欄位 |
| `lib/actions/vocabulary.ts` | 修改 `markReview`；新增 `getFailStats` |
| `app/review/[languageId]/ReviewClient.tsx` | 忘記時也呼叫 `markReview` |
| `app/languages/[id]/LanguageClient.tsx` | 新增「錯誤統計」入口連結 |
| `app/languages/[id]/stats/page.tsx` | 新增統計頁面（server component） |
| DB migration | Drizzle Kit 自動產生 |

---

## 不在範圍內

- 跨語言全局統計
- 每日/每週錯誤趨勢圖表
- 重置錯誤次數功能
