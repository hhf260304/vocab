# 已畢業單字 Sheet 設計文件

**日期：** 2026-03-25
**功能：** 點擊語言頁面的「已畢業」統計卡片，從右側滑出 Sheet 顯示所有已畢業單字

---

## 目標

讓使用者能快速瀏覽某個語言下所有已畢業（`reviewStage === 5`）的單字，支援依分類或依畢業時間兩種排列方式，不離開目前頁面。

---

## 架構

### 資料流

```
已畢業卡片點擊
  → Sheet 開啟（onOpenChange: true）
  → 若尚無資料，呼叫 getGraduatedVocab(languageId)
  → 依 groupBy state 組織資料（useMemo）
  → 渲染清單
```

### 新增檔案

- `lib/actions/vocabulary.ts` — 新增 `getGraduatedVocab` action
- `components/GraduatedSheet.tsx` — 新 client component

### 修改檔案

- `app/languages/[id]/LanguageClient.tsx` — 將「已畢業」統計卡片改為可點擊，掛上 `GraduatedSheet`

---

## Server Action

**`getGraduatedVocab(languageId: string)`**

查詢條件：`userId = currentUser`, `languageId = languageId`, `reviewStage = 5`

回傳型別：
```ts
type GraduatedVocab = {
  id: string
  front: string
  back: string
  categoryName: string | null  // LEFT JOIN categories table（未分類的字不可被排除）
  lastReviewedAt: Date | null  // 用作畢業日期；null 時顯示「—」，排序時置於最後
}
```

**JOIN 策略：** 必須使用 LEFT JOIN categories，確保未分類（`categoryId = null`）的已畢業單字也被包含在結果中。

**`lastReviewedAt` 為 null 的處理：**
- 畢業日期顯示為「—」
- 「依畢業時間」排序時，null 值排在最後（非 null 的依降序排列）

---

## GraduatedSheet 元件

### Props

```ts
interface GraduatedSheetProps {
  languageId: string
  totalCount: number  // 已從父層算好，直接顯示於 header
}
```

### 內部 State

```ts
const [open, setOpen] = useState(false)
const [groupBy, setGroupBy] = useState<'category' | 'date'>('category')
const [vocab, setVocab] = useState<GraduatedVocab[] | null>(null)
```

### Fetch 策略

- Sheet 開啟時（`onOpenChange(true)`）才觸發 fetch
- 已有資料（`vocab !== null`）則跳過，避免重複請求
- 載入中顯示 skeleton（3-4 條灰色橫條）

### 排列模式

**依分類（預設）：**
- 用 `useMemo` 將陣列 group by `categoryName`
- 無分類的單字歸入「未分類」群組
- 群組依分類名稱字母排序
- 每筆顯示：單字（大）+ 翻譯（同行）、畢業日期（次行）
- 群組標題顯示分類名稱 + 該分類單字數

**依畢業時間：**
- 同一陣列依 `lastReviewedAt` 降序排列（最新畢業在上）
- 每筆顯示：單字 + 翻譯（同行）、分類 badge + 畢業日期（次行）

### 切換控制

Sheet header 下方的 toggle bar，兩個按鈕：「依分類」/ 「依畢業時間」，當前選中的按鈕高亮（`background:#1e3a5f; color:#60a5fa`）。

---

## 邊界情況

| 情況 | 處理方式 |
|------|---------|
| 0 個已畢業單字 | 顯示空狀態：「還沒有畢業的單字，繼續加油！」 |
| 載入中 | Skeleton（3-4 條灰色橫條） |
| 無分類的單字 | 歸入「未分類」群組（僅依分類模式） |
| `totalCount` 為 0 | 卡片仍可點擊，開啟後顯示空狀態 |

---

## UI 規格

- 使用 shadcn `Sheet`（從右側滑入）
- 配色延續深洋藍風格：背景 `#0f172a`、分隔線 `#1e293b`、次要文字 `#94a3b8`
- 每筆行高緊湊：padding `8-9px 20px`
- 分類 badge：`background:#1e3a5f; color:#60a5fa`
- 畢業日期格式：`YYYY/MM/DD`
