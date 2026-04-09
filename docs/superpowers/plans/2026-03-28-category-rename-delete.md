# Category Rename & Delete Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add「重新命名」and「刪除分類」buttons to the category detail page header, only shown for real (non-virtual) categories.

**Architecture:** All changes are in `CategoryClient.tsx`. The server actions `updateCategory` and `deleteCategory` already exist in `lib/actions/categories.ts`. Rename uses a `Dialog` with a pre-filled `Input`; delete uses an `AlertDialog` for confirmation then redirects to the language page.

**Tech Stack:** Next.js App Router, React, shadcn/ui (`Dialog`, `AlertDialog`, `Input`, `Button`)

---

### Task 1: Add rename and delete to CategoryClient

**Files:**
- Modify: `app/languages/[id]/categories/[categoryId]/CategoryClient.tsx`

- [ ] **Step 1: Add state and imports**

Add these imports (replace the existing import block at the top):

```tsx
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import VocabCard from "@/components/VocabCard";
import { createVocabularies, deleteVocabulary } from "@/lib/actions/vocabulary";
import { deleteCategory, updateCategory } from "@/lib/actions/categories";
import type { Category, Language, Vocabulary } from "@/lib/db/schema";
```

Add new state variables inside the component, alongside the existing ones:

```tsx
const [renameOpen, setRenameOpen] = useState(false);
const [renameName, setRenameName] = useState("");
const [isRenameSubmitting, setIsRenameSubmitting] = useState(false);
const [deleteOpen, setDeleteOpen] = useState(false);
const [isDeleteSubmitting, setIsDeleteSubmitting] = useState(false);
```

- [ ] **Step 2: Add handler functions**

Add these two handlers inside the component, after `confirmDelete` (the vocab delete handler):

```tsx
async function handleRename() {
  const trimmed = renameName.trim();
  if (!trimmed) return;
  setIsRenameSubmitting(true);
  await updateCategory(category.id, trimmed, language.id);
  setIsRenameSubmitting(false);
  setRenameOpen(false);
  router.refresh();
}

async function handleDeleteCategory() {
  setIsDeleteSubmitting(true);
  await deleteCategory(category.id, language.id);
  setIsDeleteSubmitting(false);
  router.push(`/languages/${language.id}`);
}
```

- [ ] **Step 3: Add buttons to the header**

In the title section (the `<div className="flex flex-col gap-1">` containing the back button and `<h1>`), add rename and delete buttons after the `<h1>` and word count paragraph. The rename/delete buttons should only appear when `!isVirtual`. Replace the entire title block:

```tsx
<div className="flex flex-col gap-1">
  <Button
    variant="ghost"
    size="sm"
    className="self-start -ml-2 text-muted-foreground"
    onClick={() => router.push(`/languages/${language.id}`)}
  >
    <ArrowLeft className="w-4 h-4 mr-1" />
    {language.name}
  </Button>
  <h1 className="text-2xl font-bold text-foreground">{category.name}</h1>
  <p className="text-sm text-muted-foreground">
    {initialVocabularies.length} 個單字
  </p>
  {!isVirtual && (
    <div className="flex gap-2 mt-1">
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          setRenameName(category.name);
          setRenameOpen(true);
        }}
      >
        <Pencil className="w-3.5 h-3.5 mr-1" />
        重新命名
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="text-destructive hover:text-destructive"
        onClick={() => setDeleteOpen(true)}
      >
        <Trash2 className="w-3.5 h-3.5 mr-1" />
        刪除分類
      </Button>
    </div>
  )}
</div>
```

- [ ] **Step 4: Add rename Dialog**

Add the rename `Dialog` after the existing vocab delete `AlertDialog` (before the batch add `Dialog`):

```tsx
{/* 重新命名 */}
<Dialog open={renameOpen} onOpenChange={(o) => !isRenameSubmitting && setRenameOpen(o)}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>重新命名分類</DialogTitle>
      <DialogDescription>輸入新的分類名稱</DialogDescription>
    </DialogHeader>
    <Input
      autoFocus
      value={renameName}
      onChange={(e) => setRenameName(e.target.value)}
      onKeyDown={(e) => e.key === "Enter" && handleRename()}
      placeholder="分類名稱..."
    />
    <DialogFooter>
      <Button variant="outline" onClick={() => setRenameOpen(false)} disabled={isRenameSubmitting}>
        取消
      </Button>
      <Button onClick={handleRename} disabled={isRenameSubmitting || !renameName.trim()}>
        {isRenameSubmitting ? "儲存中…" : "儲存"}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

- [ ] **Step 5: Add delete category AlertDialog**

Add the category delete `AlertDialog` after the rename `Dialog`:

```tsx
{/* 刪除分類確認 */}
<AlertDialog open={deleteOpen} onOpenChange={(o) => !isDeleteSubmitting && setDeleteOpen(o)}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>確認刪除分類</AlertDialogTitle>
      <AlertDialogDescription>
        確定刪除「{category.name}」分類？分類內的單字將移至未分類。此操作無法復原。
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel disabled={isDeleteSubmitting}>取消</AlertDialogCancel>
      <AlertDialogAction
        onClick={handleDeleteCategory}
        disabled={isDeleteSubmitting}
        className="bg-destructive text-white hover:bg-destructive/90"
      >
        {isDeleteSubmitting ? "刪除中…" : "刪除"}
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

- [ ] **Step 6: Verify in browser**

1. Navigate to a real category page — confirm「重新命名」and「刪除分類」buttons appear below the title
2. Test rename: click button → dialog opens with current name pre-filled → change name → save → page title updates
3. Test delete: click button → alert dialog shows → confirm → redirected to language page, category gone
4. Navigate to「未分類」— confirm neither button appears

- [ ] **Step 7: Commit**

```bash
git add app/languages/\[id\]/categories/\[categoryId\]/CategoryClient.tsx
git commit -m "feat: add rename and delete buttons to category detail page"
```
