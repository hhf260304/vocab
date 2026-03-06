# Batch Category Creation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a "批次新增" button on the language page that opens a Dialog with a multi-line textarea, allowing users to create multiple categories at once.

**Architecture:** Add a `createCategories` Server Action that validates and batch-inserts categories in one DB call. In `LanguageClient.tsx`, add a new Dialog component triggered by a "批次新增" button. Validation rejects all if any duplicates found (vs. existing or within input itself).

**Tech Stack:** Next.js App Router, Server Actions, Drizzle ORM, shadcn/ui (Dialog, Textarea, Button)

---

### Task 1: Add `createCategories` Server Action

**Files:**
- Modify: `lib/actions/categories.ts`

**Step 1: Add the batch action**

Append to `lib/actions/categories.ts`:

```ts
export async function createCategories(
  names: string[],
  languageId: string
): Promise<{ duplicates: string[] } | { created: number }> {
  const userId = await getUserId();

  const trimmed = names.map((n) => n.trim()).filter(Boolean);
  if (trimmed.length === 0) return { created: 0 };

  // Fetch existing category names for this language
  const existing = await db
    .select({ name: categories.name })
    .from(categories)
    .where(and(eq(categories.userId, userId), eq(categories.languageId, languageId)));

  const existingNames = existing.map((c) => c.name.toLowerCase());

  // Find duplicates: against existing AND within input itself
  const seen = new Set<string>();
  const duplicates: string[] = [];

  for (const name of trimmed) {
    const lower = name.toLowerCase();
    if (existingNames.includes(lower) || seen.has(lower)) {
      duplicates.push(name);
    }
    seen.add(lower);
  }

  if (duplicates.length > 0) return { duplicates };

  await db.insert(categories).values(
    trimmed.map((name) => ({ userId, name, languageId }))
  );

  revalidatePath(`/languages/${languageId}`);
  return { created: trimmed.length };
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors

**Step 3: Commit**

```bash
git add lib/actions/categories.ts
git commit -m "feat: add createCategories batch server action"
```

---

### Task 2: Add Dialog UI to LanguageClient

**Files:**
- Modify: `app/languages/[id]/LanguageClient.tsx`

**Step 1: Add import for Dialog and Textarea**

At the top of `LanguageClient.tsx`, add to the existing import block:

```ts
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { createCategories } from "@/lib/actions/categories";
```

**Step 2: Add state for the Dialog**

Inside the `LanguageClient` component, after existing state declarations, add:

```ts
const [batchOpen, setBatchOpen] = useState(false);
const [batchText, setBatchText] = useState("");
const [batchDuplicates, setBatchDuplicates] = useState<string[]>([]);
const [isBatchSubmitting, setIsBatchSubmitting] = useState(false);
```

**Step 3: Add batch submit handler**

After `handleAddCategory`, add:

```ts
async function handleBatchCreate() {
  const names = batchText
    .split("\n")
    .map((n) => n.trim())
    .filter(Boolean);
  if (names.length === 0) return;

  setIsBatchSubmitting(true);
  const result = await createCategories(names, language.id);
  setIsBatchSubmitting(false);

  if ("duplicates" in result) {
    setBatchDuplicates(result.duplicates);
    return;
  }

  setBatchOpen(false);
  setBatchText("");
  setBatchDuplicates([]);
}
```

**Step 4: Add "批次新增" button and Dialog**

In the JSX, find the section header div (around line 252-254):

```tsx
<div className="flex items-center justify-between">
  <h2 className="text-lg font-semibold text-foreground">單字庫</h2>
  <Button onClick={() => setShowCatInput((s) => !s)}>+ 新增分類</Button>
</div>
```

Replace with:

```tsx
<div className="flex items-center justify-between">
  <h2 className="text-lg font-semibold text-foreground">單字庫</h2>
  <div className="flex gap-2">
    <Button variant="outline" onClick={() => {
      setBatchOpen(true);
      setBatchText("");
      setBatchDuplicates([]);
    }}>
      批次新增
    </Button>
    <Button onClick={() => setShowCatInput((s) => !s)}>+ 新增分類</Button>
  </div>
</div>
```

**Step 5: Add Dialog component**

Before the closing `</div>` of the component (after the delete confirmation AlertDialog), add:

```tsx
<Dialog open={batchOpen} onOpenChange={(open) => {
  setBatchOpen(open);
  if (!open) {
    setBatchText("");
    setBatchDuplicates([]);
  }
}}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>批次新增分類</DialogTitle>
      <DialogDescription>每行輸入一個分類名稱</DialogDescription>
    </DialogHeader>
    <div className="flex flex-col gap-2">
      <Textarea
        autoFocus
        rows={8}
        placeholder={"動詞\n名詞\n形容詞"}
        value={batchText}
        onChange={(e) => {
          setBatchText(e.target.value);
          if (batchDuplicates.length > 0) setBatchDuplicates([]);
        }}
      />
      {batchDuplicates.length > 0 && (
        <p className="text-sm text-destructive">
          以下名稱重複，請修改後再送出：
          {batchDuplicates.map((d) => (
            <span key={d} className="block font-medium">・{d}</span>
          ))}
        </p>
      )}
    </div>
    <DialogFooter>
      <Button variant="outline" onClick={() => setBatchOpen(false)}>
        取消
      </Button>
      <Button onClick={handleBatchCreate} disabled={isBatchSubmitting}>
        {isBatchSubmitting ? "建立中…" : "建立"}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**Step 6: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors

**Step 7: Commit**

```bash
git add app/languages/[id]/LanguageClient.tsx
git commit -m "feat: add batch category creation dialog"
```

---

### Task 3: Manual Verification

**Step 1: Start dev server**

```bash
npm run dev
```

**Step 2: Test happy path**

1. Navigate to a language page
2. Click "批次新增"
3. Enter multiple category names (one per line), all unique
4. Click 建立
5. Dialog closes, categories appear in list

**Step 3: Test duplicate detection**

1. Click "批次新增"
2. Enter a name that already exists as a category
3. Click 建立
4. Dialog stays open, red error lists the duplicate name

**Step 4: Test self-duplicate in input**

1. Click "批次新增"
2. Enter the same name twice in the textarea
3. Click 建立
4. Dialog stays open, red error lists the duplicate

**Step 5: Test empty lines ignored**

1. Enter names with blank lines in between
2. Click 建立
3. Only non-empty lines are created

**Step 6: Commit if any fixes needed, then done**
