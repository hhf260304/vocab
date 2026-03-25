# Zhuyin Auto-Lookup Design

**Date:** 2026-03-25
**Feature:** Auto-populate zhuyin field from MoE dictionary when adding/editing Chinese vocabulary

---

## Overview

When a user is adding or editing a vocabulary word with Chinese (zh-TW) as the target language, the zhuyin field should be automatically populated by querying the Taiwan Ministry of Education (MoE) dictionary API (`moedict.tw`) when the user leaves the "back" (target word) input field.

---

## Architecture

### Backend: Server Action

**File:** `lib/actions/zhuyin.ts`

```ts
"use server";
export async function lookupZhuyin(word: string): Promise<string | null>
```

**Implementation details:**
- Input: trim the word before use; return `null` immediately if trimmed value is empty
- URL: `https://www.moedict.tw/api/${encodeURIComponent(word.trim())}`
- Headers: include `User-Agent` and `Accept` headers to pass Cloudflare checks (moedict.tw uses Cloudflare which blocks bare server requests)
- Parse `heteronyms[0].bopomofo2` from the response — `bopomofo2` contains unicode tone-marked zhuyin symbols (e.g. `ㄋㄧˇ`), which is the correct representation for display and storage
- Return `null` on fetch failure, non-200 response, or missing field — never throw

**Note on MoE API field names:**
- `bopomofo` — tone-number notation (e.g. `ㄋㄧ3`)
- `bopomofo2` — unicode tone-mark notation (e.g. `ㄋㄧˇ`) ← use this one

**Multi-pronunciation handling:** Returns only the first heteronym (`heteronyms[0]`), the most common reading. User can override manually.

**No auth check required** — queries public data only.

### Frontend: VocabForm.tsx

The component already has an `isChineseLanguage` boolean derived from `languages.find(l => l.id === form.languageId)?.ttsCode === "zh-TW"`. Use this existing variable as the guard — do not re-derive it.

**New state:**
```ts
const [zhuyinLoading, setZhuyinLoading] = useState(false)
const [zhuyinNotFound, setZhuyinNotFound] = useState(false)
```

**Trigger:** `onBlur` on the `back` input field, only when ALL of the following are true:
- `isChineseLanguage === true`
- `form.back.trim()` is non-empty
- `zhuyinLoading === false` (guard against concurrent in-flight requests)

**Behavior:**
- **Loading:** set `zhuyinLoading = true`, `zhuyinNotFound = false`; zhuyin input is `disabled` while loading
- **Success:** auto-fill `form.zhuyin` (always overwrites existing value), set `zhuyinLoading = false`
- **Not found / error:** set `zhuyinLoading = false`, `zhuyinNotFound = true`; show helper text below zhuyin input: 「查無結果，請手動輸入」

**Submit while loading:** The submit button is disabled while `zhuyinLoading === true` to prevent submitting without the lookup result.

**Reset:** When the user manually edits the zhuyin field (`onChange`), set `zhuyinNotFound = false` (clears the not-found message).

---

## Data Flow

```
User types in "back" field
       ↓
User leaves field (onBlur)
       ↓
isChineseLanguage && back.trim() non-empty && !zhuyinLoading?
       ↓ yes
setZhuyinLoading(true), setZhuyinNotFound(false)
lookupZhuyin(form.back)   ← server action → moedict.tw API
       ↓
  result?
  ├─ string → setField("zhuyin", result), setZhuyinLoading(false)
  └─ null   → setZhuyinLoading(false), setZhuyinNotFound(true)
```

---

## Error Handling

| Scenario | Behavior |
|---|---|
| Word found in MoE dict | Auto-fill zhuyin, overwrite any existing value |
| Word not in MoE dict | Show 「查無結果，請手動輸入」 |
| Network / fetch / Cloudflare error | Return `null`, show same not-found message |
| User blurs while lookup in flight | Skip (guard: `zhuyinLoading === true`) |
| User manually edits zhuyin | Clear not-found message |
| Submit while lookup in flight | Submit button disabled until lookup completes |

---

## Out of Scope

- Batch add words (`createVocabularies`) — no auto-lookup for bulk imports
- Per-character fallback lookup for phrases not in MoE dict
- Caching/deduplication of repeated lookups
