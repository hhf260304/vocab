// components/FlashCard.tsx
"use client";

import { useEffect, useState } from "react";
import { Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Vocabulary } from "@/lib/db/schema";

interface Props {
  vocab: Vocabulary;
  ttsCode: string;
  onRemembered: () => void;
  onForgot: () => void;
}

export default function FlashCard({
  vocab,
  ttsCode,
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

  function handleAnswer(remembered: boolean) {
    setFlipped(false);
    setTimeout(() => {
      if (remembered) onRemembered();
      else onForgot();
    }, 150);
  }

  const frontContent = vocab.front;
  const backContent = vocab.back;

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
          <div className="backface-hidden rotate-y-180 absolute inset-0 bg-teal-700 rounded-3xl flex flex-col items-center justify-center p-6 shadow-sm">
            <p className="text-4xl font-bold text-white text-center">
              {backContent}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  speakBack();
                }}
                className="text-teal-200 hover:text-white transition-colors"
              >
                <Volume2 className="h-5 w-5" />
              </button>
            </div>
            {vocab.zhuyin && (
              <div className="mt-4 text-center">
                <p className="text-stone-200 text-sm">{vocab.zhuyin}</p>
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
