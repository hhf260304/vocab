# 複習模式錄音功能設計

**日期：** 2026-04-09  
**範圍：** `components/FlashCard.tsx`

## 概述

在複習模式的 FlashCard 元件中加入錄音功能，讓使用者能在翻牌前後各自錄下自己的發音，並手動回放與 TTS 正確發音比對。完全使用瀏覽器原生 API，不需後端或外部服務。

## 需求

- 正面（翻牌前）可錄音，用於記錄嘗試發音
- 反面（翻牌後）可錄音，用於記錄模仿發音
- 兩個錄音區互相獨立，翻牌不互相影響
- 錄音完成後手動點擊播放，不自動播放
- 可重新錄音覆蓋上一次的錄音
- 換下一張卡時自動清除錄音（由 React key 機制處理）

## 狀態機

每個錄音區（正面 / 反面）各自維護相同狀態：

```
idle → recording → recorded
         ↑               |
         └───────────────┘ (重新錄音)
```

| 狀態 | 說明 | 圖示 | 顏色 |
|------|------|------|------|
| `idle` | 等待開始錄音 | `Mic` | `text-muted-foreground`（正面）/ `text-indigo-200`（反面） |
| `recording` | 錄音中 | `Square` | `text-red-400 animate-pulse` |
| `recorded` | 已錄音，可播放 | `Play` | `text-emerald-400` |

## UI 佈局

**正面：**
- 卡片底部「點擊翻轉」提示旁（或其上方），加一個小麥克風圖示按鈕
- `recorded` 狀態時：Play 圖示 + 旁邊極小的 `RotateCcw` 重新錄音按鈕

**反面：**
- 現有 `Volume2`（TTS）按鈕旁邊並排，加一個麥克風圖示按鈕
- `recorded` 狀態時：Play 圖示 + 旁邊極小的 `RotateCcw` 重新錄音按鈕

## 實作細節

### 型別

```ts
type RecStatus = "idle" | "recording" | "recorded";
type RecState = { status: RecStatus; blob: Blob | null };
```

### State 與 Ref

```ts
const [frontRec, setFrontRec] = useState<RecState>({ status: "idle", blob: null });
const [backRec, setBackRec]   = useState<RecState>({ status: "idle", blob: null });
const mediaRecorderRef = useRef<MediaRecorder | null>(null);
const chunksRef        = useRef<BlobPart[]>([]);
const objectUrlRef     = useRef<string[]>([]); // 追蹤待 revoke 的 URL
```

### 錄音流程

1. 點擊麥克風（`idle` → `recording`）
   - `navigator.mediaDevices.getUserMedia({ audio: true })`
   - 建立 `MediaRecorder`，監聽 `ondataavailable` 累積 chunks
   - `mediaRecorder.start()`
2. 點擊停止（`recording` → `recorded`）
   - `mediaRecorder.stop()`
   - `onstop` callback：`new Blob(chunks, { type: "audio/webm" })` → 存入 state
3. 點擊播放（`recorded`）
   - `URL.createObjectURL(blob)` → 存入 `objectUrlRef`
   - `new Audio(url).play()`
4. 點擊重新錄音（`recorded` → `idle`）
   - 清除 blob，回到 `idle`

### 權限處理

`getUserMedia` 被拒絕時靜默回到 `idle`，不彈錯誤視窗，避免干擾複習流程。

### Cleanup

```ts
useEffect(() => {
  return () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    objectUrlRef.current.forEach(URL.revokeObjectURL);
  };
}, []);
```

## 不在此次範圍內

- 語音辨識 / 文字比對
- 發音評分
- 錄音儲存至伺服器
- 波形視覺化
