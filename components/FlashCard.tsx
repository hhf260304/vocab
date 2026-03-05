// components/FlashCard.tsx
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { Vocabulary } from "@/lib/db/schema";

interface Props {
  vocab: Vocabulary;
  ttsCode: string;
  defaultSide: "front" | "back";
  onRemembered: () => void;
  onForgot: () => void;
}

export default function FlashCard({
  vocab,
  ttsCode,
  defaultSide,
  onRemembered,
  onForgot,
}: Props) {
  // defaultSide='front' → 初始未翻轉（正面朝上）
  // defaultSide='back'  → 初始已翻轉（反面朝上，立即播音）
  const [flipped, setFlipped] = useState(defaultSide === "back");

  function speakBack() {
    const utterance = new SpeechSynthesisUtterance(vocab.back);
    utterance.lang = ttsCode;
    speechSynthesis.speak(utterance);
  }

  // 進入新卡片時，若 defaultSide='back' 立即播音
  useEffect(() => {
    if (defaultSide === "back") {
      speakBack();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vocab.id]);

  // 翻轉至反面時播音（僅 defaultSide='front' 時會觸發）
  useEffect(() => {
    if (flipped && defaultSide === "front") {
      speakBack();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flipped]);

  function handleAnswer(remembered: boolean) {
    setFlipped(defaultSide === "back");
    setTimeout(() => {
      if (remembered) onRemembered();
      else onForgot();
    }, 150);
  }

  const frontContent = defaultSide === "front" ? vocab.front : vocab.back;
  const backContent = defaultSide === "front" ? vocab.back : vocab.front;
  const backIsTarget = defaultSide === "front"; // 反面才是目標語言

  return (
    <div className="flex flex-col items-center gap-6 w-full">
      <div className="perspective w-full max-w-sm">
        <div
          className={`relative w-full h-56 cursor-pointer transform-style-3d transition-transform duration-500 ${flipped ? "rotate-y-180" : ""}`}
          onClick={() => setFlipped((f) => !f)}
        >
          {/* 正面 */}
          <div className="backface-hidden absolute inset-0 bg-white rounded-3xl border-2 border-stone-200 flex flex-col items-center justify-center p-6 shadow-sm">
            <p className="text-4xl font-bold text-stone-900 text-center">
              {frontContent}
            </p>
            <p className="text-stone-400 text-sm mt-4">點擊翻轉</p>
          </div>

          {/* 反面 */}
          <div className="backface-hidden rotate-y-180 absolute inset-0 bg-stone-800 rounded-3xl flex flex-col items-center justify-center p-6 shadow-sm">
            <p className="text-4xl font-bold text-white text-center">
              {backContent}
            </p>
            {backIsTarget && (
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    speakBack();
                  }}
                  className="text-stone-300 hover:text-white transition-colors text-xl"
                >
                  🔊
                </button>
              </div>
            )}
            {vocab.exampleJp && (
              <div className="mt-4 text-center">
                <p className="text-stone-200 text-sm">{vocab.exampleJp}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {flipped && (
        <div className="flex gap-4 w-full max-w-sm">
          <Button
            variant="outline"
            className="flex-1 h-auto py-3.5 bg-red-50 text-red-600 border-red-200 hover:bg-red-100 hover:text-red-600 rounded-2xl font-semibold"
            onClick={() => handleAnswer(false)}
          >
            😞 忘記
          </Button>
          <Button
            variant="outline"
            className="flex-1 h-auto py-3.5 bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100 hover:text-emerald-600 rounded-2xl font-semibold"
            onClick={() => handleAnswer(true)}
          >
            😊 記得
          </Button>
        </div>
      )}
    </div>
  );
}
