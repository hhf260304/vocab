// components/FlashCard.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Play, RotateCcw, Square, ThumbsDown, ThumbsUp, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Vocabulary } from "@/lib/db/schema";

type RecStatus = "idle" | "recording" | "recorded";
type RecState = { status: RecStatus; blob: Blob | null };

interface Props {
  vocab: Vocabulary;
  ttsCode: string;
  categoryName?: string;
  isAnswering?: boolean;
  onRemembered: () => void;
  onForgot: () => void;
}

export default function FlashCard({
  vocab,
  ttsCode,
  categoryName,
  isAnswering = false,
  onRemembered,
  onForgot,
}: Props) {
  const [frontRec, setFrontRec] = useState<RecState>({ status: "idle", blob: null });
  const [backRec, setBackRec]   = useState<RecState>({ status: "idle", blob: null });
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef        = useRef<BlobPart[]>([]);
  const objectUrlRef     = useRef<string[]>([]);
  const audioRef         = useRef<HTMLAudioElement | null>(null);

  const [flipped, setFlipped] = useState(false);

  function speakBack() {
    const utterance = new SpeechSynthesisUtterance(vocab.back);
    utterance.lang = ttsCode;
    speechSynthesis.speak(utterance);
  }

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
        const mimeType = MediaRecorder.isTypeSupported("audio/mp4")
          ? "audio/mp4"
          : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "audio/ogg";
        const blob = new Blob(chunksRef.current, { type: mimeType });
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

  function stopRecording() {
    mediaRecorderRef.current?.stop();
  }

  function playRecording(blob: Blob) {
    const url = URL.createObjectURL(blob);
    objectUrlRef.current.push(url);
    audioRef.current = new Audio(url);
    audioRef.current.play().catch(() => {});
  }

  function resetRecording(side: "front" | "back") {
    const setter = side === "front" ? setFrontRec : setBackRec;
    setter({ status: "idle", blob: null });
  }

  // 翻轉至反面時播音
  useEffect(() => {
    if (flipped) {
      const utterance = new SpeechSynthesisUtterance(vocab.back);
      utterance.lang = ttsCode;
      speechSynthesis.speak(utterance);
    }
  }, [flipped, vocab.back, ttsCode]);

  // 鍵盤快捷鍵：Space/Enter 翻牌，← 忘記，→ 記得
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (isAnswering) return;

      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        setFlipped((f) => !f);
      } else if (e.key === "ArrowLeft" && flipped) {
        e.preventDefault();
        onForgot();
      } else if (e.key === "ArrowRight" && flipped) {
        e.preventDefault();
        onRemembered();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [flipped, isAnswering, onForgot, onRemembered]);

  useEffect(() => {
    const urls = objectUrlRef.current;
    return () => {
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      urls.forEach(URL.revokeObjectURL);
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-6 w-full card-enter">
      <div className="perspective w-full max-w-sm">
        <div
          className={`grid w-full cursor-pointer transform-style-3d transition-transform duration-300 active:scale-[0.97] ${flipped ? "rotate-y-180" : ""}`}
          onClick={() => setFlipped((f) => !f)}
        >
          {/* 正面 */}
          <div className="[grid-area:1/1] backface-hidden bg-white rounded-3xl border-2 border-indigo-100 flex flex-col items-center justify-center p-6 min-h-[180px] shadow-[0_2px_0_0_rgba(79,70,229,0.12),0_8px_24px_-4px_rgba(79,70,229,0.10)]">
            {categoryName && (
              <Badge className="absolute top-4 left-4 bg-indigo-50 text-indigo-600 border-indigo-200 hover:bg-indigo-50 font-medium text-xs">
                {categoryName}
              </Badge>
            )}
            <p className="text-4xl font-bold text-foreground text-center">
              {vocab.front}
            </p>
            <p className="text-muted-foreground text-sm mt-4">點擊翻轉</p>
          </div>

          {/* 反面 */}
          <div
            className="[grid-area:1/1] backface-hidden rotate-y-180 rounded-3xl flex flex-col items-center justify-center p-6 min-h-[180px] shadow-[0_2px_0_0_rgba(79,70,229,0.2),0_8px_24px_-4px_rgba(79,70,229,0.15)]"
            style={{ background: "linear-gradient(135deg, #4F46E5, #7C3AED)" }}
          >
            <p className="text-4xl font-bold text-white text-center">
              {vocab.back}
            </p>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); speakBack(); }}
              className="p-2.5 rounded-full text-indigo-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer mt-2"
              aria-label="播放發音"
            >
              <Volume2 className="h-5 w-5" />
            </button>
            {vocab.zhuyin && (
              <p className="mt-4 text-indigo-100 text-sm text-center">{vocab.zhuyin}</p>
            )}
            {vocab.exampleJp && (
              <p className="mt-2 text-indigo-100 text-sm text-center">{vocab.exampleJp}</p>
            )}
          </div>
        </div>
      </div>

      {/* 錄音控制區：正面未翻時顯示正面錄音，翻轉後顯示反面錄音 */}
      <div className="flex items-center gap-1">
        {!flipped && (
          <>
            {frontRec.status === "idle" && (
              <button
                type="button"
                onClick={() => startRecording("front")}
                className="p-2.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                aria-label="開始錄音"
              >
                <Mic className="h-5 w-5" />
              </button>
            )}
            {frontRec.status === "recording" && (
              <button
                type="button"
                onClick={() => stopRecording()}
                className="p-2.5 rounded-full text-red-400 animate-pulse cursor-pointer"
                aria-label="停止錄音"
              >
                <Square className="h-5 w-5" />
              </button>
            )}
            {frontRec.status === "recorded" && frontRec.blob && (
              <>
                <button
                  type="button"
                  onClick={() => playRecording(frontRec.blob!)}
                  className="p-2.5 rounded-full text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                  aria-label="播放錄音"
                >
                  <Play className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => resetRecording("front")}
                  className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                  aria-label="重新錄音"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              </>
            )}
          </>
        )}
        {flipped && (
          <>
            {backRec.status === "idle" && (
              <button
                type="button"
                onClick={() => startRecording("back")}
                className="p-2.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                aria-label="開始錄音"
              >
                <Mic className="h-5 w-5" />
              </button>
            )}
            {backRec.status === "recording" && (
              <button
                type="button"
                onClick={() => stopRecording()}
                className="p-2.5 rounded-full text-red-400 animate-pulse cursor-pointer"
                aria-label="停止錄音"
              >
                <Square className="h-5 w-5" />
              </button>
            )}
            {backRec.status === "recorded" && backRec.blob && (
              <>
                <button
                  type="button"
                  onClick={() => playRecording(backRec.blob!)}
                  className="p-2.5 rounded-full text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                  aria-label="播放錄音"
                >
                  <Play className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => resetRecording("back")}
                  className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                  aria-label="重新錄音"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              </>
            )}
          </>
        )}
      </div>

      {flipped ? (
        <div className="flex flex-col items-center gap-3 w-full max-w-sm">
          <div className="flex gap-4 w-full">
            <Button
              variant="outline"
              className="flex-1 h-auto py-3.5 bg-red-50 text-red-600 border-red-200 hover:bg-red-100 hover:text-red-600 rounded-2xl font-semibold gap-2 active:scale-[0.97] transition-transform"
              onClick={() => onForgot()}
              disabled={isAnswering}
            >
              <ThumbsDown className="w-4 h-4" /> 忘記
            </Button>
            <Button
              variant="outline"
              className="flex-1 h-auto py-3.5 bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100 hover:text-emerald-600 rounded-2xl font-semibold gap-2 active:scale-[0.97] transition-transform"
              onClick={() => onRemembered()}
              disabled={isAnswering}
            >
              <ThumbsUp className="w-4 h-4" /> 記得
            </Button>
          </div>
          <p className="text-xs text-muted-foreground/60 select-none">
            <kbd className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono text-[11px]">←</kbd>
            {" 忘記 · 記得 "}
            <kbd className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono text-[11px]">→</kbd>
          </p>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground/60 select-none">
          <kbd className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono text-[11px]">Space</kbd>
          {" 翻轉"}
        </p>
      )}
    </div>
  );
}
