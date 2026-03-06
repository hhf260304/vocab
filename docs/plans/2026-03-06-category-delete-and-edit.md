# Category Delete Cascade & Edit Name Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 刪除分類時一併刪除底下所有單字；並允許使用者 inline 編輯分類名稱。

**Architecture:** 修改 DB foreign key 為 cascade delete（需 migration），更新確認 dialog 文字，新增 updateCategory server action，在 CategorySection header 加入 inline 編輯 UI。

**Tech Stack:** Next.js 16, Drizzle ORM, Neon Postgres, TypeScript, React

---

### Task 1: 修改 DB schema cascade 並執行 migration

**Files:**
- Modify: `lib/db/schema.ts`

**Step 1: 修改 schema**

在 `lib/db/schema.ts` 找到 `vocabulary` table 的 `categoryId` 欄位：

```ts
categoryId: text("category_id").references(() => categories.id, {
  onDelete: "set null",
}),
```

改為：

```ts
categoryId: text("category_id").references(() => categories.id, {
  onDelete: "cascade",
}),
```

**Step 2: 產生 migration**

```bash
npx drizzle-kit generate
```

預期：`drizzle/` 目錄產生新 `.sql` 檔，內容包含 `DROP CONSTRAINT` 舊的 foreign key 並 `ADD CONSTRAINT` 新的 cascade foreign key。

**Step 3: 執行 migration**

```bash
npx drizzle-kit migrate
```

預期：migration 成功套用。

**Step 4: Commit**

```bash
git add lib/db/schema.ts drizzle/
git commit -m "feat: cascade delete vocabulary when category is deleted"
```

---

### Task 2: 更新確認 dialog 文字

**Files:**
- Modify: `app/languages/[id]/LanguageClient.tsx`

**Step 1: 讀取目前檔案**

讀取 `app/languages/[id]/LanguageClient.tsx`，找到 AlertDialog 中刪除分類的說明文字：

```tsx
`確定刪除分類「${pendingDelete?.name}」？屬於此分類的單字將變為未分類。`
```

**Step 2: 更新文字**

改為：

```tsx
`確定刪除分類「${pendingDelete?.name}」？此分類底下的所有單字將一併刪除，此操作無法復原。`
```

**Step 3: Commit**

```bash
git add app/languages/[id]/LanguageClient.tsx
git commit -m "fix: update category delete confirmation text to reflect cascade delete"
```

---

### Task 3: 新增 updateCategory server action

**Files:**
- Modify: `lib/actions/categories.ts`

**Step 1: 讀取目前檔案**

讀取 `lib/actions/categories.ts`。

**Step 2: 新增 updateCategory**

在 `deleteCategory` 函式之後新增：

```ts
export async function updateCategory(id: string, name: string, languageId: string) {
  const userId = await getUserId();
  const trimmed = name.trim();
  if (!trimmed) throw new Error("分類名稱不能為空");

  await db
    .update(categories)
    .set({ name: trimmed })
    .where(and(eq(categories.id, id), eq(categories.userId, userId)));

  revalidatePath(`/languages/${languageId}`);
}
```

**Step 3: Commit**

```bash
git add lib/actions/categories.ts
git commit -m "feat: add updateCategory server action"
```

---

### Task 4: 在 CategorySection 加入 inline 編輯 UI

**Files:**
- Modify: `app/languages/[id]/LanguageClient.tsx`

**Step 1: 讀取目前檔案**

讀取 `app/languages/[id]/LanguageClient.tsx`，重點了解 `CategorySection` 元件的 props interface 與 header 區塊。

**Step 2: 新增 import**

確認已 import `updateCategory`：

```ts
import { createCategory, createCategories, deleteCategory, updateCategory } from "@/lib/actions/categories";
```

**Step 3: 在 CategorySection props interface 新增 onRename**

在 `CategorySection` 的 props interface 加入：

```ts
onRename: (id: string, newName: string) => void;
```

**Step 4: 在 CategorySection 內新增 editing 狀態**

在 `CategorySection` 函式內的 state 宣告處加入：

```ts
const [isEditing, setIsEditing] = useState(false);
const [editName, setEditName] = useState(cat.name);
```

**Step 5: 新增 handleRename 函式**

在 `CategorySection` 函式內 `handleBatchCreate` 之後加入：

```ts
async function handleRename() {
  const trimmed = editName.trim();
  if (!trimmed || trimmed === cat.name) {
    setIsEditing(false);
    setEditName(cat.name);
    return;
  }
  await updateCategory(cat.id, trimmed, languageId);
  onRename(cat.id, trimmed);
  setIsEditing(false);
}
```

**Step 6: 修改 header 區塊，支援 inline 編輯**

找到 `CategorySection` 的 header 區塊（`CollapsibleTrigger` 與右側按鈕列），目前結構：

```tsx
<div className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/50 transition-colors">
  <CollapsibleTrigger className="flex items-center gap-2 flex-1 min-w-0 text-left">
    <span className="font-semibold text-foreground truncate min-w-0">{cat.name}</span>
    <span className="text-sm text-muted-foreground shrink-0">
      {vocabs.length} 個單字
    </span>
    <span className="text-muted-foreground text-xs ml-auto">
      {open ? "▼" : "▶"}
    </span>
  </CollapsibleTrigger>
  <div className="flex items-center gap-1.5 ml-2 shrink-0">
    <Button size="sm" variant="outline" onClick={() => { setBatchOpen(true); setBatchText(""); setBatchErrors([]); }}>
      批次新增
    </Button>
    <Button size="sm" asChild>
      <Link href={`/vocabulary/new?languageId=${languageId}&categoryId=${cat.id}`}>
        + 單字
      </Link>
    </Button>
    <Button
      variant="ghost"
      size="sm"
      className="text-muted-foreground hover:text-destructive px-2"
      onClick={() => onDeleteCategory(cat.id)}
      aria-label={`刪除分類「${cat.name}」`}
    >
      ×
    </Button>
  </div>
</div>
```

替換為（支援 inline 編輯的版本）：

```tsx
<div className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/50 transition-colors">
  {isEditing ? (
    <div className="flex items-center gap-2 flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
      <Input
        autoFocus
        className="h-7 text-sm font-semibold"
        value={editName}
        onChange={(e) => setEditName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleRename();
          if (e.key === "Escape") { setIsEditing(false); setEditName(cat.name); }
        }}
      />
      <Button size="sm" variant="outline" onClick={handleRename} className="shrink-0">✓</Button>
      <Button size="sm" variant="ghost" onClick={() => { setIsEditing(false); setEditName(cat.name); }} className="shrink-0">✕</Button>
    </div>
  ) : (
    <CollapsibleTrigger className="flex items-center gap-2 flex-1 min-w-0 text-left">
      <span className="font-semibold text-foreground truncate min-w-0">{cat.name}</span>
      <span className="text-sm text-muted-foreground shrink-0">
        {vocabs.length} 個單字
      </span>
      <span className="text-muted-foreground text-xs ml-auto">
        {open ? "▼" : "▶"}
      </span>
    </CollapsibleTrigger>
  )}
  {!isEditing && (
    <div className="flex items-center gap-1.5 ml-2 shrink-0">
      <Button size="sm" variant="outline" onClick={() => { setBatchOpen(true); setBatchText(""); setBatchErrors([]); }}>
        批次新增
      </Button>
      <Button size="sm" asChild>
        <Link href={`/vocabulary/new?languageId=${languageId}&categoryId=${cat.id}`}>
          + 單字
        </Link>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="text-muted-foreground hover:text-foreground px-2"
        onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
        aria-label={`編輯分類「${cat.name}」`}
      >
        ✏️
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="text-muted-foreground hover:text-destructive px-2"
        onClick={() => onDeleteCategory(cat.id)}
        aria-label={`刪除分類「${cat.name}」`}
      >
        ×
      </Button>
    </div>
  )}
</div>
```

**Step 7: 在 LanguageClient 主元件的 groups.map 傳入 onRename**

找到：

```tsx
<CategorySection
  key={cat.id}
  cat={cat}
  vocabs={vocabs}
  languageId={language.id}
  ttsCode={language.ttsCode}
  isChineseLanguage={language.ttsCode === "zh-TW"}
  onDelete={handleDeleteVocab}
  onDeleteCategory={handleDeleteCategory}
/>
```

新增 `onRename` prop：

```tsx
<CategorySection
  key={cat.id}
  cat={cat}
  vocabs={vocabs}
  languageId={language.id}
  ttsCode={language.ttsCode}
  isChineseLanguage={language.ttsCode === "zh-TW"}
  onDelete={handleDeleteVocab}
  onDeleteCategory={handleDeleteCategory}
  onRename={(id, newName) => {
    // optimistic update: router.refresh() handles revalidation
  }}
/>
```

**注意：** `updateCategory` 已呼叫 `revalidatePath`，所以 `handleRename` 結束後 Next.js 會自動 refresh，不需要額外的 client state 更新。但需要傳入 `onRename` prop 以滿足 TypeScript。可傳空函式 `() => {}`。

**Step 8: Commit**

```bash
git add app/languages/[id]/LanguageClient.tsx
git commit -m "feat: add inline category name editing in CategorySection"
```

---

### Task 5: 手動測試

**Step 1: 啟動開發伺服器**

```bash
npm run dev
```

**Step 2: 測試 cascade delete**
- 建立一個分類，在其下新增 2 筆單字
- 刪除該分類
- 確認確認 dialog 顯示「此分類底下的所有單字將一併刪除」
- 確認刪除後，那 2 筆單字也消失（不出現在「未分類」）

**Step 3: 測試編輯分類名稱**
- 在任意分類的 header 點擊 ✏️ 按鈕
- 確認 header 切換為 inline input（預填現有名稱）
- 輸入新名稱後按 Enter → 確認名稱更新
- 再次點擊 ✏️，按 Esc → 確認取消，名稱未改變
- 清空名稱後按 Enter → 確認不送出（取消回原名稱）
