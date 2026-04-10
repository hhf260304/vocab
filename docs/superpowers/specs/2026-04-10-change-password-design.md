# 修改密碼功能設計

**日期：** 2026-04-10  
**狀態：** 已核准

---

## 概述

在現有的詞彙學習 App 中加入「修改密碼」功能。使用者透過獨立的設定頁面 `/settings` 修改密碼，未來此頁面可擴充其他帳號設定（如修改用戶名）。

---

## 架構

### 新增檔案

| 檔案 | 類型 | 說明 |
|------|------|------|
| `app/settings/page.tsx` | Server Component | 設定頁面，組合各 section；未登入 redirect 到 `/login` |
| `app/settings/ChangePasswordSection.tsx` | Client Component | 修改密碼表單，管理本地 state |

### 修改檔案

| 檔案 | 說明 |
|------|------|
| `lib/actions/auth.ts` | 加入 `changePassword` server action |
| `components/Navbar.tsx` | 加入「設定」導覽連結 |

---

## 資料流

1. 使用者瀏覽 `/settings`
2. Server component 呼叫 `auth()` 取得 session；未登入則 `redirect("/login")`
3. 頁面渲染 `ChangePasswordSection`（client component）
4. 使用者填寫舊密碼、新密碼、確認新密碼後送出
5. Client 先檢查新密碼與確認新密碼是否一致，不一致則直接顯示錯誤，不送 action
6. 呼叫 `changePassword(oldPassword, newPassword)` server action
7. Server action 回傳 `{ success: true }` 或 `{ error: string }`
8. Client 依結果顯示成功訊息或錯誤訊息

---

## Server Action：`changePassword`

位置：`lib/actions/auth.ts`

**驗證順序：**

1. 呼叫 `auth()` 取得 session，無 session → `{ error: "請先登入" }`
2. 新密碼長度 < 6 字元 → `{ error: "新密碼至少需要 6 個字元" }`
3. 從 DB 查詢 user（by `session.user.id`），取出 `passwordHash`
4. `bcryptjs.compare(oldPassword, passwordHash)` 失敗 → `{ error: "目前密碼錯誤" }`
5. `bcryptjs.hash(newPassword, 10)` 產生新 hash，寫入 DB
6. 成功 → `{ success: true }`

---

## UI 結構

### Navbar

在 `links` 陣列中加入 `{ href: "/settings", label: "設定" }`，與現有「首頁」連結使用相同樣式邏輯。

### `/settings` 頁面

```
設定                          ← h1 標題
├── 修改密碼 section          ← <section> + <h2>
│   ├── 目前密碼 (Input type="password")
│   ├── 新密碼 (Input type="password")
│   ├── 確認新密碼 (Input type="password")
│   ├── 錯誤訊息（destructive 紅字）
│   ├── 成功訊息（green 綠字）
│   └── [儲存] Button（loading 時禁用）
```

頁面使用 `flex flex-col gap-6` 與現有頁面一致。Section 間距預留未來擴充空間。

### 表單行為

- 新密碼 ≠ 確認新密碼：client 端擋住，顯示「兩次輸入的密碼不一致」，不發送 action
- 送出中：按鈕顯示「請稍候…」並 disabled
- 成功：顯示「密碼已更新」，3 秒後清除訊息，同時清空三個欄位
- 失敗：顯示 server action 回傳的錯誤字串

---

## 元件與函式庫

- `Input`, `Label`, `Button`：現有 shadcn/ui 元件，不新增依賴
- `bcryptjs`：已安裝（`register` 函式已使用）
- `auth()`：來自 `auth.ts`，server action 中驗證身份
- `db`、`users`：現有 Drizzle ORM 設定

---

## 不在本次範圍內

- 修改用戶名（預留頁面結構，但不實作）
- 忘記密碼 / Email 重設流程
- 密碼強度指示器
