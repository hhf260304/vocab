# 架構說明

---

## 設計原則

這個 App 以 **Next.js App Router** 為核心，優先使用 Server Components 和 Server Actions，只在需要互動性時才引入 Client Components。

---

## 為什麼用 Server Actions 而非 API Routes？

所有資料存取（CRUD）都透過 `lib/actions/` 下的 Server Actions 完成，沒有傳統的 `/api` 路由。

**好處：**
- 不需要手動管理 fetch URL、Content-Type header、JSON 序列化
- 型別安全：TypeScript 型別從資料庫到 UI 端對端貫通
- 認證保護簡單：每個 action 開頭呼叫 `auth()` 即可，無需 middleware
- 變更資料後直接呼叫 `revalidatePath()` 讓 Next.js 重新渲染對應頁面

---

## Data Flow：複習工作階段

複習頁是最複雜的資料流，分為三層：

```
Server Page (app/review/[languageId]/page.tsx)
    │
    │  載入到期卡片（getTodayReviews）、語言資料
    │  支援 URL 參數 ?categoryId=xxx 篩選分類
    │
    ▼
ReviewClient.tsx（Client Component）
    │
    │  在記憶體中管理：
    │  - 打亂後的卡片佇列（currentQueue）
    │  - 失敗卡片 ID（failedIds）
    │  - 當前索引、輪次、翻牌狀態
    │
    ▼  每次點「記得」或「忘了」
    │
Server Action: markReview(id, remembered)
    │
    │  更新資料庫：reviewStage, nextReviewAt,
    │  lastReviewedAt, failCount
    │  + revalidatePath("/")（更新 Dashboard 計數）
    ▼
    完成
```

---

## Auth 設計

**選用 NextAuth v5（Credentials provider）：**

- 登入：驗證 username + bcrypt 密碼，產生 JWT session
- Session 策略：JWT（不需要 session 資料表）
- 保護：每個 Server Action 開頭呼叫 `auth()`，未登入拋出錯誤
- **沒有 middleware 保護路由** — 頁面保護由 action 層負責，UI 僅做跳轉提示

```ts
// 每個需要認證的 action 開頭
const session = await auth()
if (!session?.user?.id) throw new Error("Unauthorized")
```

**資料隔離：** 所有查詢都加上 `userId` 條件，使用者只能看到自己的資料。

---

## Key Components

| 元件 | 位置 | 職責 |
|------|------|------|
| `FlashCard` | `components/FlashCard.tsx` | 3D 翻牌動畫、TTS 播放、語音錄製、鍵盤事件 |
| `ReviewClient` | `app/review/[id]/ReviewClient.tsx` | 複習工作階段狀態機（佇列、輪次、結果） |
| `LanguageClient` | `app/languages/[id]/LanguageClient.tsx` | 語言詳細頁互動（分類新增、統計顯示） |
| `GraduatedSheet` | `components/GraduatedSheet.tsx` | Side drawer：已畢業詞彙列表 |
| `Navbar` | `components/Navbar.tsx` | 頂部導覽列，含 Avatar + Dropdown 選單 |
| `VocabForm` | `components/VocabForm.tsx` | 新增 / 編輯詞彙的通用表單 |

---

## 多語言與 TTS

語言設定來源：`lib/languages-config.ts`（靜態設定，不可在 runtime 修改）

TTS 整合：`FlashCard` 元件使用 **Web Speech API**（`window.speechSynthesis`）

```ts
const utterance = new SpeechSynthesisUtterance(text)
utterance.lang = ttsCode  // 例：ja-JP
speechSynthesis.speak(utterance)
```

- 翻到背面時自動觸發
- 亦可手動點擊播放按鈕
- TTS 品質取決於瀏覽器和作業系統支援程度

---

## 注音（Zhuyin）查詢流程

`lib/actions/zhuyin.ts` 的 `lookupZhuyin(word)` Server Action：

1. 使用 `@napi-rs/pinyin` 將中文轉為拼音
2. 使用 `pinyin-zhuyin` 將拼音轉為注音符號
3. 回傳以空格分隔的注音字串（例：`ㄋㄧˇ ㄏㄠˇ`）

---

## 改進建議

以下是未來可以考慮加入的功能：

### 功能擴充

| 項目 | 說明 |
|------|------|
| **OAuth 登入** | 加入 Google / GitHub 登入，降低帳號管理門檻 |
| **複習統計圖表** | 用 Recharts 顯示每日複習量、正確率趨勢 |
| **自訂 SRS 間隔** | 讓使用者在設定頁調整各階段複習間隔 |
| **匯出備份** | 支援匯出全部詞彙為 CSV / JSON，方便備份或遷移 |
| **PWA 支援** | 加入 Service Worker，支援離線複習已快取的卡片 |
| **卡片圖片** | 在詞彙中加入圖片欄位，強化記憶效果 |

### 技術改善

| 項目 | 說明 |
|------|------|
| **樂觀更新（Optimistic UI）** | `markReview` 後本地先更新 UI，不等 Server 回應，降低感知延遲 |
| **OAuth 整合** | 目前只有 Credentials provider；加入 OAuth 後需增加 `accounts` 資料表 |
| **E2E 測試** | 複習流程是核心功能，適合用 Playwright 撰寫端對端測試 |
| **DB 欄位重命名** | `vocabulary.japanese` / `vocabulary.chinese` 改為 `front` / `back`，避免語意混淆 |
