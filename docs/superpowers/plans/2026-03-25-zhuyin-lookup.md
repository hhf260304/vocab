# Zhuyin Auto-Lookup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When adding/editing a Chinese vocabulary word, auto-populate the zhuyin field by querying the MoE dictionary (moedict.tw) when the user leaves the "back" input.

**Architecture:** A new server action `lookupZhuyin` proxies the moedict.tw API (avoiding browser CORS issues), returning the `bopomofo2` field (unicode tone-mark zhuyin). `VocabForm.tsx` calls this on `onBlur` of the "back" field when the selected language is Chinese (zh-TW), with loading/not-found state to drive UI feedback.

**Tech Stack:** Next.js App Router, React `useState`, server actions (`"use server"`), native `fetch`

---

## File Map

| File | Change |
|---|---|
| `lib/actions/zhuyin.ts` | **Create** — server action that fetches from moedict.tw and returns zhuyin string or null |
| `components/VocabForm.tsx` | **Modify** — add two state vars, `onBlur` handler, disabled state on zhuyin input, not-found helper text, submit button guard |

---

## Task 1: Create the `lookupZhuyin` server action

**Files:**
- Create: `lib/actions/zhuyin.ts`

### Background

The moedict.tw API endpoint is `https://www.moedict.tw/api/{word}`. It returns JSON shaped like:

```json
{
  "title": "你",
  "heteronyms": [
    {
      "bopomofo": "ㄋㄧ3",
      "bopomofo2": "ㄋㄧˇ",
      ...
    }
  ]
}
```

We want `heteronyms[0].bopomofo2` — the unicode tone-mark form.

The API is behind Cloudflare; bare server requests without headers may get blocked. Include browser-like `User-Agent` and `Accept` headers.

- [ ] **Step 1: Create the file with the server action**

Create `lib/actions/zhuyin.ts` with this exact content:

```ts
"use server";

export async function lookupZhuyin(word: string): Promise<string | null> {
  const trimmed = word.trim();
  if (!trimmed) return null;

  try {
    const res = await fetch(
      `https://www.moedict.tw/api/${encodeURIComponent(trimmed)}`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "application/json",
        },
      },
    );

    if (!res.ok) return null;

    const data = await res.json();
    const bopomofo2 = data?.heteronyms?.[0]?.bopomofo2;
    return typeof bopomofo2 === "string" ? bopomofo2 : null;
  } catch {
    return null;
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npm run build`

Expected: build succeeds with no TypeScript errors. (Next.js may show other pre-existing warnings — that is fine. The new file must not introduce errors.)

- [ ] **Step 3: Commit**

```bash
git add lib/actions/zhuyin.ts
git commit -m "feat: add lookupZhuyin server action for MoE dictionary"
```

---

## Task 2: Wire `lookupZhuyin` into `VocabForm.tsx`

**Files:**
- Modify: `components/VocabForm.tsx`

### Background

`VocabForm.tsx` is a client component (`"use client"`). It already has:
- `isChineseLanguage` (line 109) — boolean, true when selected language has `ttsCode === "zh-TW"`
- `setField(field, value)` helper — updates `form` state
- `isSubmitting` state — already disables the submit button

We need to add two new state variables and wire them into the zhuyin section of the form.

The zhuyin `<Input>` is at lines 228-232. The submit `<Button>` is at line 330.

- [ ] **Step 1: Add the import for `lookupZhuyin`**

In `components/VocabForm.tsx`, add to the existing imports (after the last import line):

```ts
import { lookupZhuyin } from "@/lib/actions/zhuyin";
```

- [ ] **Step 2: Add the two new state variables**

Inside the `VocabForm` component function, after the existing `useState` declarations (after line 56), add:

```ts
const [zhuyinLoading, setZhuyinLoading] = useState(false);
const [zhuyinNotFound, setZhuyinNotFound] = useState(false);
```

- [ ] **Step 3: Add the `handleBackBlur` handler**

After the `handleSubmit` function (after line 107), add:

```ts
async function handleBackBlur() {
  if (!isChineseLanguage || !form.back.trim() || zhuyinLoading) return;
  setZhuyinLoading(true);
  setZhuyinNotFound(false);
  const result = await lookupZhuyin(form.back);
  if (result !== null) {
    setField("zhuyin", result);
  } else {
    setZhuyinNotFound(true);
  }
  setZhuyinLoading(false);
}
```

- [ ] **Step 4: Wire `onBlur` onto the `back` input**

In `components/VocabForm.tsx`, find the `back` `<Input>` inside its `<div className="flex gap-2">` wrapper (lines 199-221). Only the `<Input>` element itself needs changing — leave the surrounding wrapper and TTS button untouched.

Find this exact `<Input>`:

```tsx
<Input
  id="back"
  value={form.back}
  onChange={(e) => setField("back", e.target.value)}
  required
/>
```

Replace it with:

```tsx
<Input
  id="back"
  value={form.back}
  onChange={(e) => setField("back", e.target.value)}
  onBlur={handleBackBlur}
  required
/>
```

- [ ] **Step 5: Replace the zhuyin `<div>` with loading/not-found feedback**

Find the entire zhuyin section (lines 226-233 in the original file):

```tsx
<div className="flex flex-col gap-1.5">
  <Label htmlFor="zhuyin">注音</Label>
  <Input
    id="zhuyin"
    value={form.zhuyin}
    onChange={(e) => setField("zhuyin", e.target.value)}
  />
</div>
```

Replace the entire block with:

```tsx
<div className="flex flex-col gap-1.5">
  <Label htmlFor="zhuyin">注音</Label>
  <Input
    id="zhuyin"
    value={form.zhuyin}
    onChange={(e) => {
      setField("zhuyin", e.target.value);
      setZhuyinNotFound(false);
    }}
    disabled={zhuyinLoading}
  />
  {zhuyinLoading && (
    <p className="text-xs text-muted-foreground">查詢中…</p>
  )}
  {zhuyinNotFound && !zhuyinLoading && (
    <p className="text-xs text-muted-foreground">查無結果，請手動輸入</p>
  )}
</div>
```

- [ ] **Step 6: Disable the submit button while `zhuyinLoading` is true**

Find the submit `<Button>` (around line 330):

```tsx
<Button type="submit" className="w-full mt-2" disabled={isSubmitting}>
```

Replace with:

```tsx
<Button type="submit" className="w-full mt-2" disabled={isSubmitting || zhuyinLoading}>
```

- [ ] **Step 7: Verify TypeScript compiles**

Run: `npm run build`

Expected: build succeeds with no TypeScript errors.

- [ ] **Step 8: Manual browser test**

Run: `npm run dev`

Test checklist:
1. Navigate to `/vocabulary/new`
2. Select **中文** as the language
3. Type a Chinese word in the "反面（目標語言）" field (e.g. `你好`)
4. Press Tab or click elsewhere to blur the field
5. ✅ Zhuyin field becomes disabled and shows "查詢中…"
6. ✅ Zhuyin field auto-fills (e.g. `ㄋㄧˇ ㄏㄠˇ`) and re-enables
7. Try a non-existent entry (e.g. `aaaaa`)
8. ✅ Shows "查無結果，請手動輸入" below the zhuyin field
9. Edit the zhuyin field manually
10. ✅ "查無結果" message disappears
11. While the lookup is in progress, ✅ the submit button is disabled
12. Open an existing Chinese word edit page → blur the "反面" field → ✅ existing zhuyin is overwritten with lookup result

- [ ] **Step 9: Commit**

```bash
git add components/VocabForm.tsx
git commit -m "feat: auto-populate zhuyin from MoE dictionary on back field blur"
```
