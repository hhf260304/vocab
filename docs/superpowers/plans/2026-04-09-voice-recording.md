# Voice Recording Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 FlashCard 元件的正面與反面各加入獨立的錄音控制，讓使用者能錄下自己的發音並手動回放比對。

**Architecture:** 所有邏輯集中在 `components/FlashCard.tsx`，使用瀏覽器原生 `MediaRecorder` API。正面與反面各有獨立的 `RecState`，透過同一組 handler 函式（以 `side` 參數區分）操作，換卡時由 React `key` 自動重置狀態。

**Tech Stack:** React useState/useRef/useEffect, MediaRecorder API, lucide-react (Mic, Square, Play, RotateCcw)

---

## File Map

| 動作 | 路徑 | 說明 |
|------|------|------|
| Modify | `components/FlashCard.tsx` | 唯一需要改動的檔案：加入型別、state、refs、handler 函式、UI |

---

### Task 1: 加入 imports、型別、state、refs

**Files:**
- Modify: `components/FlashCard.tsx:1-10`（imports）
- Modify: `components/FlashCard.tsx:19-27`（元件開頭）

- [ ] **Step 1: 更新 import 列（第 1-6 行）**

將現有：
```tsx
import { useEffect, useState } from "react";
import { ThumbsDown, ThumbsUp, Volume2 } from "lucide-react";
```
改為：
```tsx
import { useEffect, useRef, useState } from "react";
import { Mic, Play, RotateCcw, Square, ThumbsDown, ThumbsUp, Volume2 } from "lucide-react";
```

- [ ] **Step 2: 在元件內、`flipped` state 之前加入型別與 state/refs**

在 `const [flipped, setFlipped] = useState(false);` 這一行之前插入：

```tsx
type RecStatus = "idle" | "recording" | "recorded";
type RecState = { status: RecStatus; blob: Blob | null };

const [frontRec, setFrontRec] = useState<RecState>({ status: "idle", blob: null });
const [backRec, setBackRec]   = useState<RecState>({ status: "idle", blob: null });
const mediaRecorderRef = useRef<MediaRecorder | null>(null);
const chunksRef        = useRef<BlobPart[]>([]);
const objectUrlRef     = useRef<string[]>([]);
```

- [ ] **Step 3: 在鍵盤快捷鍵 useEffect 之後加入 cleanup useEffect**

```tsx
useEffect(() => {
  return () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    objectUrlRef.current.forEach(URL.revokeObjectURL);
  };
}, []);
```

- [ ] **Step 4: 執行 lint 確認無錯誤**

```bash
npm run lint
```
Expected: 無 error（可能有 warning，可忽略）

---

### Task 2: 實作 startRecording 函式

**Files:**
- Modify: `components/FlashCard.tsx`（在 `speakBack` 函式之後插入）

- [ ] **Step 1: 插入 startRecording 函式**

在 `function speakBack() { ... }` 之後插入：

```tsx
async function startRecording(side: "front" | "back") {
  const setter = side === "front" ? setFrontRec : setBackRec;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    chunksRef.current = [];
    const mr = new MediaRecorder(stream);
    mr.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      setter({ status: "recorded", blob });
      stream.getTracks().forEach((t) => t.stop());
    };
    mr.start();
    mediaRecorderRef.current = mr;
    setter({ status: "recording", blob: null });
  } catch {
    setter({ status: "idle", blob: null });
  }
}
```

- [ ] **Step 2: 執行 lint 確認無錯誤**

```bash
npm run lint
```
Expected: 無 error

---

### Task 3: 實作 stopRecording、playRecording、resetRecording 函式

**Files:**
- Modify: `components/FlashCard.tsx`（在 `startRecording` 之後插入）

- [ ] **Step 1: 插入三個輔助函式**

在 `startRecording` 函式之後插入：

```tsx
function stopRecording() {
  mediaRecorderRef.current?.stop();
}

function playRecording(blob: Blob) {
  const url = URL.createObjectURL(blob);
  objectUrlRef.current.push(url);
  new Audio(url).play();
}

function resetRecording(side: "front" | "back") {
  const setter = side === "front" ? setFrontRec : setBackRec;
  setter({ status: "idle", blob: null });
}
```

- [ ] **Step 2: 執行 lint 確認無錯誤**

```bash
npm run lint
```
Expected: 無 error

- [ ] **Step 3: Commit**

```bash
git add components/FlashCard.tsx
git commit -m "feat(FlashCard): 加入錄音 state、refs 與 handler 函式"
```

---

### Task 4: 更新正面 UI — 加入錄音控制

**Files:**
- Modify: `components/FlashCard.tsx`（正面 JSX 區塊）

正面目前的「點擊翻轉」提示：
```tsx
<p className="text-muted-foreground text-sm mt-4">點擊翻轉</p>
```

- [ ] **Step 1: 將上方那行替換為含錄音控制的 flex 列**

```tsx
<div className="flex items-center gap-2 mt-4">
  <p className="text-muted-foreground text-sm">點擊翻轉</p>
  {frontRec.status === "idle" && (
    <button
      onClick={(e) => { e.stopPropagation(); startRecording("front"); }}
      className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
      aria-label="開始錄音"
    >
      <Mic className="h-4 w-4" />
    </button>
  )}
  {frontRec.status === "recording" && (
    <button
      onClick={(e) => { e.stopPropagation(); stopRecording(); }}
      className="text-red-400 animate-pulse cursor-pointer"
      aria-label="停止錄音"
    >
      <Square className="h-4 w-4" />
    </button>
  )}
  {frontRec.status === "recorded" && frontRec.blob && (
    <div className="flex items-center gap-1">
      <button
        onClick={(e) => { e.stopPropagation(); playRecording(frontRec.blob!); }}
        className="text-emerald-500 hover:text-emerald-600 transition-colors cursor-pointer"
        aria-label="播放錄音"
      >
        <Play className="h-4 w-4" />
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); resetRecording("front"); }}
        className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        aria-label="重新錄音"
      >
        <RotateCcw className="h-3 w-3" />
      </button>
    </div>
  )}
</div>
```

- [ ] **Step 2: 執行 lint 確認無錯誤**

```bash
npm run lint
```
Expected: 無 error

- [ ] **Step 3: 手動驗證正面錄音**

`npm run dev` 啟動後至複習頁面：
1. 正面顯示麥克風圖示
2. 點擊麥克風 → 瀏覽器請求麥克風權限 → 圖示變紅色閃爍（Square）
3. 點擊 Square → 圖示變為綠色播放鍵（Play）+ 重新錄音鈕
4. 點擊 Play → 可聽到剛才錄的聲音
5. 點擊 RotateCcw → 回到麥克風圖示（idle）
6. 翻牌時，正面狀態保持不變（不因翻牌而重置）

- [ ] **Step 4: Commit**

```bash
git add components/FlashCard.tsx
git commit -m "feat(FlashCard): 加入正面錄音控制 UI"
```

---

### Task 5: 更新反面 UI — 加入錄音控制

**Files:**
- Modify: `components/FlashCard.tsx`（反面 JSX 區塊）

反面目前的按鈕列：
```tsx
<div className="flex items-center gap-2 mt-2">
  <button
    onClick={(e) => {
      e.stopPropagation();
      speakBack();
    }}
    className="text-indigo-200 hover:text-white transition-colors cursor-pointer"
    aria-label="播放發音"
  >
    <Volume2 className="h-5 w-5" />
  </button>
</div>
```

- [ ] **Step 1: 將上方整個 div 替換為含錄音控制的版本**

```tsx
<div className="flex items-center gap-2 mt-2">
  <button
    onClick={(e) => {
      e.stopPropagation();
      speakBack();
    }}
    className="text-indigo-200 hover:text-white transition-colors cursor-pointer"
    aria-label="播放發音"
  >
    <Volume2 className="h-5 w-5" />
  </button>
  {backRec.status === "idle" && (
    <button
      onClick={(e) => { e.stopPropagation(); startRecording("back"); }}
      className="text-indigo-200 hover:text-white transition-colors cursor-pointer"
      aria-label="開始錄音"
    >
      <Mic className="h-5 w-5" />
    </button>
  )}
  {backRec.status === "recording" && (
    <button
      onClick={(e) => { e.stopPropagation(); stopRecording(); }}
      className="text-red-400 animate-pulse cursor-pointer"
      aria-label="停止錄音"
    >
      <Square className="h-5 w-5" />
    </button>
  )}
  {backRec.status === "recorded" && backRec.blob && (
    <div className="flex items-center gap-1">
      <button
        onClick={(e) => { e.stopPropagation(); playRecording(backRec.blob!); }}
        className="text-emerald-400 hover:text-white transition-colors cursor-pointer"
        aria-label="播放錄音"
      >
        <Play className="h-5 w-5" />
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); resetRecording("back"); }}
        className="text-indigo-200 hover:text-white transition-colors cursor-pointer"
        aria-label="重新錄音"
      >
        <RotateCcw className="h-3.5 w-3.5" />
      </button>
    </div>
  )}
</div>
```

- [ ] **Step 2: 執行 lint 確認無錯誤**

```bash
npm run lint
```
Expected: 無 error

- [ ] **Step 3: 手動驗證反面錄音**

`npm run dev` 啟動後至複習頁面：
1. 翻牌後反面顯示 Volume2（TTS）與 Mic（錄音）並排
2. 點擊 Mic → 請求權限 → 紅色閃爍 Square
3. 點擊 Square → 綠色 Play + RotateCcw
4. 點擊 Play → 播放錄音
5. 同時點擊 Volume2（TTS）→ TTS 正常播放，不受錄音影響
6. 正面與反面的錄音**互相獨立**：翻回正面，正面狀態不變
7. 點擊「記得」或「忘記」進入下一張卡（key 改變） → 兩面錄音狀態均重置為 idle

- [ ] **Step 4: 執行 build 確認可正常編譯**

```bash
npm run build
```
Expected: `✓ Compiled successfully`（無 TypeScript 錯誤）

- [ ] **Step 5: Commit**

```bash
git add components/FlashCard.tsx
git commit -m "feat(FlashCard): 加入反面錄音控制 UI，完成錄音功能"
```
