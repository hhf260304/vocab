# RWD Targeted Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix four components that overflow or become cramped on mobile screens (320–375px) without changing the overall centered narrow-column layout.

**Architecture:** Surgical Tailwind class changes only — no structural changes, no new abstractions. Each task is one component. Use `sm:` breakpoint (640px) only for VocabCard's flex direction flip; all other fixes use overflow/shrink utilities that apply at all sizes.

**Tech Stack:** Next.js 15, Tailwind CSS v4, shadcn/ui

---

### Task 1: Fix Navbar logo overflow on small screens

**Files:**
- Modify: `components/Navbar.tsx:23-25`

**Step 1: Make the change**

In `Navbar.tsx`, find the logo `<Link>` (line 23) and the right-side `<div>` (line 26). Apply protective classes:

```tsx
// Before
<Link href="/" className="font-bold text-foreground text-lg tracking-wide">
  📚 VocabFlow
</Link>
<div className="flex items-center gap-1">

// After
<Link href="/" className="font-bold text-foreground text-lg tracking-wide min-w-0 truncate">
  📚 VocabFlow
</Link>
<div className="flex items-center gap-1 shrink-0">
```

**Step 2: Verify visually**

Run the dev server: `bun dev`

Resize browser to 320px width. Logo should truncate gracefully rather than wrapping or pushing the user info off-screen. User info (avatar + logout button) stays fully visible.

**Step 3: Commit**

```bash
git add components/Navbar.tsx
git commit -m "fix: prevent navbar logo overflow on small screens"
```

---

### Task 2: Fix VocabCard button squeeze on small screens

**Files:**
- Modify: `components/VocabCard.tsx:33,66`

**Step 1: Make the change**

In `VocabCard.tsx`, update the outer `CardContent` inner div and the button group div:

```tsx
// Before (line 33)
<CardContent className="p-4 flex items-center justify-between gap-4">

// After
<CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
```

```tsx
// Before (line 66)
<div className="flex gap-2 shrink-0">

// After
<div className="flex gap-2 shrink-0 self-end sm:self-auto">
```

**Step 2: Verify visually**

At 320px: the vocab word/translation block is on top, Edit/Delete buttons sit at bottom-right on their own line.
At 640px+: reverts to the original side-by-side horizontal layout.

**Step 3: Commit**

```bash
git add components/VocabCard.tsx
git commit -m "fix: stack VocabCard vertically on small screens"
```

---

### Task 3: Fix CategorySection header crowding on small screens

**Files:**
- Modify: `app/languages/[id]/LanguageClient.tsx:54-79`

**Step 1: Make the change**

Find the `CategorySection` component's header row. Two changes:
1. `CollapsibleTrigger` gets `min-w-0` so it can shrink
2. The button group `<div>` gets `shrink-0` and tighter gap

```tsx
// Before (line 55)
<CollapsibleTrigger className="flex items-center gap-2 flex-1 text-left">

// After
<CollapsibleTrigger className="flex items-center gap-2 flex-1 min-w-0 text-left">
```

```tsx
// Before (line 64)
<div className="flex items-center gap-2 ml-3 shrink-0">

// After
<div className="flex items-center gap-1.5 ml-2 shrink-0">
```

**Step 2: Verify visually**

At 320px: category name + word count can truncate if needed, but the "+ 單字" and "×" buttons always remain fully visible and tappable.

**Step 3: Commit**

```bash
git add app/languages/[id]/LanguageClient.tsx
git commit -m "fix: prevent CategorySection header overflow on small screens"
```

---

### Task 4: Fix add-category form button squeeze on small screens

**Files:**
- Modify: `app/languages/[id]/LanguageClient.tsx:259-283`

**Step 1: Make the change**

Find the `handleAddCategory` form (inside the `showCatInput` conditional). Add `shrink-0` to both buttons so the input gets all remaining space:

```tsx
// Before (line 271)
<Button type="submit">建立</Button>
<Button
  type="button"
  variant="outline"
  onClick={() => { ... }}
>
  取消
</Button>

// After
<Button type="submit" className="shrink-0">建立</Button>
<Button
  type="button"
  variant="outline"
  className="shrink-0"
  onClick={() => { ... }}
>
  取消
</Button>
```

**Step 2: Verify visually**

At 375px: Input expands to fill available space, "建立" and "取消" buttons keep their natural width and don't get squished.

**Step 3: Commit**

```bash
git add app/languages/[id]/LanguageClient.tsx
git commit -m "fix: prevent add-category form overflow on small screens"
```

---

## Done

All four targeted fixes are in. No layout changes, no new files. The centered narrow-column design is preserved at all screen sizes.
