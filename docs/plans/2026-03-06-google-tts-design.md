# Google Cloud TTS Integration Design

## Problem

Browser Web Speech API (`SpeechSynthesisUtterance`) quality is poor and varies by system. Need higher-quality, consistent pronunciation across all supported languages.

## Solution

Replace Web Speech API with Google Cloud Text-to-Speech API via a server-side Next.js API route.

## Architecture

```
Frontend (click speaker) → POST /api/tts { text, languageCode }
                         → Google Cloud TTS REST API
                         → MP3 audio (base64)
                         → Frontend plays via Audio object
```

## Key Decisions

- **No caching**: User's monthly usage (~7,200 chars) is well within the 1M char free tier, so caching adds complexity with no benefit.
- **Neural2 voices**: Best quality within free tier.
- **API Key auth**: Stored in `.env` as `GOOGLE_TTS_API_KEY`, not exposed to frontend.

## Voice Map

| ttsCode | Google Voice |
|---------|-------------|
| `en-US` | `en-US-Neural2-F` |
| `ja-JP` | `ja-JP-Neural2-B` |
| `zh-TW` | `zh-TW-Neural2-A` |
| `ko-KR` | `ko-KR-Neural2-A` |

## Components Changed

1. **`app/api/tts/route.ts`** (new) — POST handler, calls Google TTS, returns base64 MP3
2. **`lib/tts.ts`** (new) — shared `speak(text, langCode)` client utility
3. **`components/FlashCard.tsx`** — replace `speechSynthesis` calls with `speak()`
4. **`components/VocabCard.tsx`** — replace `speechSynthesis` call with `speak()`
5. **`components/VocabForm.tsx`** — replace `speechSynthesis` call with `speak()`

## Environment Variables

```
GOOGLE_TTS_API_KEY=...
```
