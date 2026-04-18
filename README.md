# 快快樂樂背單字

一個以間隔重複（SRS）為核心的個人詞彙單字卡 App，支援多語言、文字轉語音與語音錄製。

---

## Tech Stack

| 類別 | 技術 |
|------|------|
| 框架 | Next.js 16 (App Router) + React 19 |
| 資料庫 | Neon PostgreSQL + Drizzle ORM |
| 認證 | NextAuth v5（Credentials provider） |
| 樣式 | Tailwind CSS v4 + shadcn/ui |
| 狀態管理 | Zustand（客戶端） |
| 注音轉換 | @napi-rs/pinyin + pinyin-zhuyin |

---

## 快速啟動

### 1. 安裝依賴

```bash
npm install
```

### 2. 設定環境變數

建立 `.env.local`：

```env
DATABASE_URL=your_neon_postgres_connection_string
AUTH_SECRET=your_nextauth_secret
```

### 3. 執行 DB Migration

```bash
npx drizzle-kit push
```

### 4. 啟動開發伺服器

```bash
npm run dev
```

開啟 [http://localhost:3000](http://localhost:3000)

### 其他指令

```bash
npm run build   # 建置生產版本
npm run start   # 啟動生產伺服器
npm run lint    # 執行 ESLint
```

---

## 功能一覽

- **間隔重複系統（SRS）** — 6 個學習階段，複習間隔 1 → 3 → 7 → 14 → 30 天，第 6 階段為畢業
- **多輪複習** — 第一輪複習全部到期卡片，後續輪次只重複答錯的卡片
- **文字轉語音（TTS）** — 翻牌後自動播放，使用 Web Speech API，依語言設定發音
- **語音錄製** — 卡片正反兩面均可錄音、播放、重錄
- **多語言管理** — 支援中文、英文、日文、韓文、廣東話，可自訂語言與 TTS 代碼
- **分類管理** — 自定義分類，支援依分類篩選複習
- **注音標註（Zhuyin）** — 詞彙可選填注音，顯示於卡片背面
- **批次匯入** — 支援 CSV 格式批次新增詞彙
- **錯誤排行榜** — 依失敗次數排序，快速找出最常答錯的單字
- **畢業詞彙檢視** — 查看已達 Stage 6 的所有單字
- **鍵盤快捷鍵** — Space/Enter 翻牌，← 答錯，→ 答對

---

## 頁面導覽

| 路由 | 說明 |
|------|------|
| `/` | Dashboard：所有語言卡片，顯示今日待複習數量 |
| `/login` | 登入頁面 |
| `/languages/[id]` | 語言詳細頁：統計、分類列表、開始複習 |
| `/review/[languageId]` | 複習工作階段：單字卡翻牌互動 |
| `/languages/[id]/stats` | 錯誤排行榜 |
| `/languages/[id]/categories/[categoryId]` | 分類內的詞彙列表 |
| `/vocabulary/new` | 新增詞彙（單筆 / 批次匯入） |
| `/vocabulary/[id]` | 編輯詞彙 |
| `/settings` | 帳號設定（修改密碼） |

詳細頁面說明 → [docs/pages.md](docs/pages.md)

---

## 文件索引

| 文件 | 說明 |
|------|------|
| [docs/pages.md](docs/pages.md) | 每個頁面的詳細功能與元件說明 |
| [docs/srs.md](docs/srs.md) | 間隔重複系統邏輯說明 |
| [docs/schema.md](docs/schema.md) | 資料庫 Schema 與關聯圖 |
| [docs/architecture.md](docs/architecture.md) | 架構設計決策與改進建議 |
