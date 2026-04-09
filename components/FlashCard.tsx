// components/FlashCard.tsx
"use client";

import { useEffect, useState } from "react";
import { ThumbsDown, ThumbsUp, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Vocabulary } from "@/lib/db/schema";

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
  const [flipped, setFlipped] = useState(false);

  function speakBack() {
    const utterance = new SpeechSynthesisUtterance(vocab.back);
    utterance.lang = ttsCode;
    speechSynthesis.speak(utterance);
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

  return (
    <div className="flex flex-col items-center gap-6 w-full card-enter">
      <div className="perspective w-full max-w-sm">
        <div
          className={`grid w-full cursor-pointer transform-style-3d transition-transform duration-300 active:scale-[0.97] ${flipped ? "rotate-y-180" : ""}`}
          onClick={() => setFlipped((f) => !f)}
        >
          {/* 正面 */}
          <div className="[grid-area:1/1] backface-hidden bg-white rounded-3xl border-2 border-indigo-100 flex flex-col items-center justify-center p-6 min-h-40 shadow-[0_2px_0_0_rgba(79,70,229,0.12),0_8px_24px_-4px_rgba(79,70,229,0.10)]">
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
            className="[grid-area:1/1] backface-hidden rotate-y-180 rounded-3xl flex flex-col items-center justify-center p-6 min-h-40 shadow-[0_2px_0_0_rgba(79,70,229,0.2),0_8px_24px_-4px_rgba(79,70,229,0.15)]"
            style={{ background: "linear-gradient(135deg, #4F46E5, #7C3AED)" }}
          >
            <p className="text-4xl font-bold text-white text-center">
              {vocab.back}
            </p>
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
            {vocab.zhuyin && (
              <p className="mt-4 text-indigo-100 text-sm text-center">{vocab.zhuyin}</p>
            )}
            {vocab.exampleJp && (
              <p className="mt-2 text-indigo-100 text-sm text-center">{vocab.exampleJp}</p>
            )}
          </div>
        </div>
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
