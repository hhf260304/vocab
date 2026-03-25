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

- Calls `https://www.moedict.tw/api/{encodeURIComponent(word)}`
- Parses `heteronyms[0].bopomofo` from the response
- Returns `null` on fetch failure or missing result (no throw)
- No auth check required — queries public data only

**Multi-pronunciation handling:** Returns only the first heteronym (most common reading). User can override manually.

### Frontend: VocabForm.tsx

**New state:**
```ts
const [zhuyinStatus, setZhuyinStatus] = useState<"idle" | "loading" | "not-found">("idle")
```

**Trigger:** `onBlur` on the `back` input field, only when:
- `isChineseLanguage === true`
- `form.back` is non-empty

**Behavior:**
- **Loading:** zhuyin input is disabled and shows a small spinner
- **Success:** auto-fills `form.zhuyin` (always overwrites existing value), status → `"idle"`
- **Not found / error:** status → `"not-found"`, shows helper text below zhuyin input: 「查無結果，請手動輸入」

**Reset:** When the user manually edits the zhuyin field, `zhuyinStatus` resets to `"idle"` (clears the not-found message).

---

## Data Flow

```
User types in "back" field
       ↓
User leaves field (onBlur)
       ↓
isChineseLanguage && back non-empty?
       ↓ yes
setZhuyinStatus("loading")
lookupZhuyin(form.back)   ← server action → moedict.tw API
       ↓
  result?
  ├─ string → setField("zhuyin", result), setZhuyinStatus("idle")
  └─ null   → setZhuyinStatus("not-found")
```

---

## Error Handling

| Scenario | Behavior |
|---|---|
| Word found in MoE dict | Auto-fill zhuyin |
| Word not in MoE dict | Show 「查無結果，請手動輸入」 |
| Network / fetch error | Return `null`, show same not-found message |
| User manually edits zhuyin | Clear not-found status |

---

## Out of Scope

- Batch add words (`createVocabularies`) — no auto-lookup for bulk imports
- Per-character fallback lookup for phrases not in MoE dict
- Caching/deduplication of repeated lookups
