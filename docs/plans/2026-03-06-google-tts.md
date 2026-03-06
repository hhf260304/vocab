# Google Cloud TTS Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace browser Web Speech API with Google Cloud TTS Neural2 voices for natural-sounding pronunciation across all supported languages.

**Architecture:** A Next.js API route (`/api/tts`) receives text + language code, calls Google Cloud TTS REST API with an API key stored server-side, and returns base64 MP3. A shared client utility `lib/tts.ts` plays the audio via the Web Audio API. Three components (FlashCard, VocabCard, VocabForm) swap out `speechSynthesis` calls for the new utility.

**Tech Stack:** Next.js API Routes, Google Cloud TTS REST API v1, TypeScript

---

### Task 1: Add Google TTS API Key to Environment

**Files:**
- Modify: `.env.local` (create if missing)
- Modify: `.env.example` or similar if present (for documentation)

**Step 1: Add to `.env.local`**

```
GOOGLE_TTS_API_KEY=your_key_here
```

To get a key:
1. Go to Google Cloud Console → APIs & Services → Credentials
2. Enable "Cloud Text-to-Speech API" on the project
3. Create an API Key and restrict it to Cloud Text-to-Speech API

**Step 2: Verify the key works with curl**

```bash
curl -X POST \
  "https://texttospeech.googleapis.com/v1/text:synthesize?key=YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"input":{"text":"hello"},"voice":{"languageCode":"en-US","name":"en-US-Neural2-F"},"audioConfig":{"audioEncoding":"MP3"}}'
```

Expected: JSON response with `audioContent` field (long base64 string).

---

### Task 2: Create `/api/tts` Route

**Files:**
- Create: `app/api/tts/route.ts`

**Step 1: Create the file**

```typescript
// app/api/tts/route.ts
import { NextRequest, NextResponse } from "next/server";

const VOICE_MAP: Record<string, string> = {
  "en-US": "en-US-Neural2-F",
  "ja-JP": "ja-JP-Neural2-B",
  "zh-TW": "zh-TW-Neural2-A",
  "ko-KR": "ko-KR-Neural2-A",
};

export async function POST(req: NextRequest) {
  const { text, languageCode } = await req.json();

  if (!text || !languageCode) {
    return NextResponse.json(
      { error: "Missing text or languageCode" },
      { status: 400 }
    );
  }

  const apiKey = process.env.GOOGLE_TTS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "TTS not configured" }, { status: 500 });
  }

  const voiceName = VOICE_MAP[languageCode] ?? `${languageCode}-Standard-A`;

  const response = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: { text },
        voice: { languageCode, name: voiceName },
        audioConfig: { audioEncoding: "MP3" },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    console.error("Google TTS error:", err);
    return NextResponse.json({ error: "TTS API error" }, { status: 502 });
  }

  const data = await response.json();
  return NextResponse.json({ audioContent: data.audioContent });
}
```

**Step 2: Test the route manually**

Start dev server (`npm run dev`) and run:

```bash
curl -X POST http://localhost:3000/api/tts \
  -H "Content-Type: application/json" \
  -d '{"text":"banana","languageCode":"en-US"}'
```

Expected: `{"audioContent":"<long base64 string>"}`.

**Step 3: Commit**

```bash
git add app/api/tts/route.ts
git commit -m "feat: add Google Cloud TTS API route"
```

---

### Task 3: Create Shared Client TTS Utility

**Files:**
- Create: `lib/tts.ts`

**Step 1: Create the file**

```typescript
// lib/tts.ts
export async function speak(text: string, langCode: string): Promise<void> {
  try {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, languageCode: langCode }),
    });

    if (!res.ok) return;

    const { audioContent } = await res.json();
    const audio = new Audio(`data:audio/mp3;base64,${audioContent}`);
    audio.play();
  } catch {
    // silently fail — pronunciation is non-critical
  }
}
```

**Step 2: Commit**

```bash
git add lib/tts.ts
git commit -m "feat: add shared TTS client utility"
```

---

### Task 4: Update FlashCard.tsx

**Files:**
- Modify: `components/FlashCard.tsx`

The file currently has two places using `speechSynthesis`:
1. `speakBack()` function (lines ~23-27)
2. `useEffect` (lines ~30-36)

**Step 1: Add import at top of file (after existing imports)**

```typescript
import { speak } from "@/lib/tts";
```

**Step 2: Replace `speakBack()` function**

Old:
```typescript
function speakBack() {
  const utterance = new SpeechSynthesisUtterance(vocab.back);
  utterance.lang = ttsCode;
  speechSynthesis.speak(utterance);
}
```

New:
```typescript
function speakBack() {
  speak(vocab.back, ttsCode);
}
```

**Step 3: Replace the useEffect body**

Old:
```typescript
useEffect(() => {
  if (flipped) {
    const utterance = new SpeechSynthesisUtterance(vocab.back);
    utterance.lang = ttsCode;
    speechSynthesis.speak(utterance);
  }
}, [flipped, vocab.back, ttsCode]);
```

New:
```typescript
useEffect(() => {
  if (flipped) {
    speak(vocab.back, ttsCode);
  }
}, [flipped, vocab.back, ttsCode]);
```

**Step 4: Verify manually**

Open a review session, flip a card, confirm pronunciation sounds natural.

**Step 5: Commit**

```bash
git add components/FlashCard.tsx
git commit -m "feat: use Google TTS in FlashCard"
```

---

### Task 5: Update VocabCard.tsx

**Files:**
- Modify: `components/VocabCard.tsx`

**Step 1: Add import**

```typescript
import { speak } from "@/lib/tts";
```

**Step 2: Replace `speak()` function body**

Old:
```typescript
function speak() {
  if (!ttsCode) return;
  const utterance = new SpeechSynthesisUtterance(vocab.back);
  utterance.lang = ttsCode;
  speechSynthesis.speak(utterance);
}
```

New:
```typescript
function speak() {
  if (!ttsCode) return;
  speak(vocab.back, ttsCode);  // ← name conflict! rename below
}
```

Note: the local function is named `speak` which conflicts with the imported `speak`. Rename the local function to `handleSpeak`:

```typescript
import { speak } from "@/lib/tts";

// ...

function handleSpeak() {
  if (!ttsCode) return;
  speak(vocab.back, ttsCode);
}
```

And update the JSX button's `onClick`:
```tsx
onClick={handleSpeak}
```

**Step 3: Commit**

```bash
git add components/VocabCard.tsx
git commit -m "feat: use Google TTS in VocabCard"
```

---

### Task 6: Update VocabForm.tsx

**Files:**
- Modify: `components/VocabForm.tsx`

**Step 1: Add import**

```typescript
import { speak } from "@/lib/tts";
```

**Step 2: Replace the onClick TTS block (around lines 200-203)**

Old:
```typescript
onClick={() => {
  const utterance = new SpeechSynthesisUtterance(form.back);
  utterance.lang = selectedLang.ttsCode;
  speechSynthesis.speak(utterance);
}}
```

New:
```typescript
onClick={() => speak(form.back, selectedLang.ttsCode)}
```

**Step 3: Commit**

```bash
git add components/VocabForm.tsx
git commit -m "feat: use Google TTS in VocabForm"
```

---

### Task 7: Final Verification

**Step 1: Test all three TTS trigger points**

1. **VocabForm** — 新增單字頁面，在「反面」欄位輸入英文單字，點擊 🔊 按鈕
2. **VocabCard** — 在語言詳情頁點擊單字卡上的 🔊 按鈕
3. **FlashCard** — 進入複習，翻轉卡片時自動播音，以及點擊 🔊 按鈕

All should play clear, natural-sounding audio.

**Step 2: Test all languages**

Verify 英文 (en-US), 日文 (ja-JP), 中文 (zh-TW) each produce correct-sounding pronunciation.
