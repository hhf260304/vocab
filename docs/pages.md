# 頁面說明

每個路由的詳細說明，包含元件類型、功能、UI 元素與觸發的 Server Actions。

---

## Dashboard — `/`

**檔案：** `app/page.tsx`
**類型：** Server Component

### 功能

使用者登入後的首頁，顯示所有已建立的語言列表。每個語言卡片會非同步顯示：
- 詞彙總數
- 今日待複習數量（SRS 到期卡片數）

### UI 元素

- **語言卡片**（`LanguageCard` 元件）— 點擊進入語言詳細頁
- **快速新增按鈕** — 5 個預設語言（中文、英文、日文、韓文、廣東話）快速建立
- **空狀態**（Globe 圖示）— 尚未建立任何語言時顯示

### Server Actions

- `getLanguages()` — 取得使用者所有語言
- `getTodayReviews(languageId)` — 取得各語言今日待複習數

---

## 登入 — `/login`

**檔案：** `app/(auth)/login/page.tsx`
**類型：** Server Component（表單為 Client Component）

### 功能

帳號密碼登入。使用者輸入 username + password，通過驗證後導向 Dashboard。

### UI 元素

- App 品牌標誌（BookOpen 圖示 + "快快樂樂背單字"）
- Username / Password 輸入欄
- 登入按鈕

### 說明

- 使用 NextAuth Credentials provider
- 不支援 OAuth / 第三方登入
- 登入失敗顯示錯誤訊息

---

## 語言詳細頁 — `/languages/[id]`

**檔案：** `app/languages/[id]/page.tsx` + `LanguageClient.tsx`
**類型：** Server Component → Client Component

### 功能

某個語言的管理中心，提供：
- 學習進度統計
- 分類管理
- 進入複習工作階段的入口

### UI 元素

**統計卡（3 個）：**
- 今日待複習數
- 詞彙總數
- 已畢業（Stage 6）數量

**操作區：**
- 「開始複習」按鈕（無到期卡片時 disabled）
- 連結至錯誤排行榜

**詞彙庫（單字庫）：**
- 分類卡片列表（顯示各分類詞彙數）
- 「未分類」虛擬分類
- 新增分類的 inline 表單（含重複名稱偵測）
- 新增詞彙按鈕

**畢業詞彙：**
- `GraduatedSheet`（side drawer）— 顯示所有 Stage 6 的詞彙及最後複習日期

### Server Actions

- `getLanguageById(id)` — 取得語言資料
- `getTodayReviews(languageId)` — 今日到期卡片
- `getCategories(languageId)` — 取得分類列表
- `getVocabularyCounts(languageId)` — 詞彙總數 / 畢業數
- `getCategoryVocabCounts(languageId)` — 各分類詞彙數
- `createCategory(name, languageId)` — 新增分類
- `deleteCategory(id, languageId)` — 刪除分類

---

## 複習工作階段 — `/review/[languageId]`

**檔案：** `app/review/[languageId]/page.tsx` + `ReviewClient.tsx`
**類型：** Server Component → Client Component

### 功能

核心學習功能。Server 端載入到期卡片後，交由 Client 管理完整的複習流程。

### 流程

1. 卡片以 Fisher-Yates 演算法洗牌
2. 依序顯示每張卡，使用者翻牌後選擇「記得」或「忘了」
3. 第一輪結束後，若有答錯卡片，進入下一輪只複習答錯的
4. 所有卡片都記得後，顯示結果畫面

### UI 元素

- **進度列** — 顯示目前輪次進度（例：5 / 12）
- **輪次指示** — 第 N 輪複習
- **FlashCard 元件** — 3D 翻牌動畫，正面顯示詞彙，背面顯示翻譯 + 例句 + 注音
- **TTS 播放按鈕** — 翻牌後自動播放，也可手動觸發
- **語音錄製** — 每面均可錄音
- **記得 / 忘了按鈕** — 翻牌後才可操作
- **刪除卡片**（確認 dialog）
- **離開按鈕** — 返回語言詳細頁

### 結果畫面

- 顯示本輪記得 / 忘了數量
- 「再練習一次忘了的」按鈕（有答錯卡片時才顯示）
- 「完成」返回按鈕

### 鍵盤快捷鍵

| 按鍵 | 動作 |
|------|------|
| `Space` / `Enter` | 翻牌 |
| `←` | 標記為忘了（翻牌後） |
| `→` | 標記為記得（翻牌後） |

### Server Actions

- `markReview(id, remembered)` — 記錄複習結果，更新 SRS 階段

---

## 分類詞彙列表 — `/languages/[id]/categories/[categoryId]`

**檔案：** `app/languages/[id]/categories/[categoryId]/page.tsx`
**類型：** Server Component

### 功能

顯示特定分類內的所有詞彙，支援進入單字複習或編輯。

### UI 元素

- 詞彙卡片列表（顯示正面、背面、SRS 階段、下次複習時間）
- 新增詞彙按鈕
- 連結至詞彙編輯頁

---

## 錯誤排行榜 — `/languages/[id]/stats`

**檔案：** `app/languages/[id]/stats/page.tsx`
**類型：** Server Component

### 功能

顯示「錯誤排行榜（錯誤排行榜）」— 依失敗次數降冪排序的詞彙列表，幫助找出最需要加強的單字。

### UI 元素

- 排名 + 詞彙正反面 + 所屬分類 badge + 失敗次數
- 空狀態（BarChart2 圖示）— 尚無失敗紀錄時顯示

### Server Actions

- `getFailStats(languageId)` — 取得 failCount > 0 的詞彙，依 failCount 降冪排列

---

## 新增詞彙 — `/vocabulary/new`

**檔案：** `app/vocabulary/new/page.tsx` → `NewVocabPageInner.tsx` → `NewVocabClient.tsx`
**類型：** Server Component → Client Component（含 Suspense boundary）

### 功能

新增詞彙，支援單筆新增和 CSV 批次匯入。

### URL 參數

- `?languageId=xxx` — 預選語言
- `?categoryId=xxx` — 預選分類

### 欄位

| 欄位 | 說明 | 必填 |
|------|------|------|
| 語言 | 目標語言選擇器 | ✓ |
| 分類 | 所屬分類選擇器 | |
| 正面（Front） | 要學習的詞彙（如日文單字） | ✓ |
| 背面（Back） | 翻譯（如中文意思） | ✓ |
| 例句 | 例句說明 | |
| 注音 | Zhuyin 標註（可自動查詢） | |

### 批次匯入格式

CSV 格式：`front,back,example,zhuyin`（每行一筆）

### Server Actions

- `createVocabulary(data)` — 單筆新增
- `createVocabularies(items, languageId, categoryId)` — 批次新增
- `lookupZhuyin(word)` — 查詢注音

---

## 編輯詞彙 — `/vocabulary/[id]`

**檔案：** `app/vocabulary/[id]/page.tsx`
**類型：** Server Component + Client 表單

### 功能

編輯現有詞彙的所有欄位，與「新增詞彙」使用相同的表單元件。

### Server Actions

- `getVocabularyById(id)` — 取得現有資料
- `updateVocabulary(id, data)` — 儲存修改

---

## 帳號設定 — `/settings`

**檔案：** `app/settings/page.tsx`
**類型：** Server Component（含認證保護，未登入自動導向 `/login`）

### 功能

目前僅支援修改密碼。

### 欄位

- 目前密碼
- 新密碼（最少 6 字元）

### Server Actions

- `changePassword(oldPassword, newPassword)` — 驗證舊密碼後更新 hash
