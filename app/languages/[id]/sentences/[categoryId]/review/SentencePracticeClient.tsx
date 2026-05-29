"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import FlashCard from "@/components/FlashCard";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { BookOpen, CheckCircle2, RotateCcw, Sparkles } from "lucide-react";
import type { Language, Sentence } from "@/lib/db/schema";

export default function SentencePracticeClient({
  sentences,
  language,
  categoryId,
  categoryName,
}: {
  sentences: Sentence[];
  language: Language;
  categoryId: string;
  categoryName: string;
}) {
  const router = useRouter();
  const backUrl = `/languages/${language.id}/sentences/${categoryId}`;

  const [currentCards, setCurrentCards] = useState<Sentence[]>(() => {
    const shuffled = [...sentences];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  });
  const [index, setIndex] = useState(0);
  const [failedIds, setFailedIds] = useState<Set<string>>(new Set());
  const [forgottenThisRound, setForgottenThisRound] = useState<Sentence[]>([]);
  const [roundRemembered, setRoundRemembered] = useState(0);
  const [round, setRound] = useState(1);
  const [view, setView] = useState<"reviewing" | "results">("reviewing");
  const [resetKey, setResetKey] = useState(0);

  const current = currentCards[index];

  if (sentences.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <BookOpen className="w-14 h-14 text-emerald-500" />
        <h2 className="text-xl font-bold text-foreground">這個分類還沒有句子</h2>
        <Button variant="link" className="text-emerald-600" onClick={() => router.push(backUrl)}>
          回到{categoryName}
        </Button>
      </div>
    );
  }

  function handleAnswer(remembered: boolean) {
    if (!current) return;
    const currentCard = current;
    const nextIndex = index + 1;
    const isLastCard = nextIndex >= currentCards.length;

    if (!remembered) {
      setFailedIds((prev) => new Set(prev).add(currentCard.id));
      setForgottenThisRound((prev) => [...prev, currentCard]);
    } else if (!failedIds.has(currentCard.id)) {
      setRoundRemembered((n) => n + 1);
    }

    if (isLastCard) setView("results");
    else setIndex(nextIndex);
  }

  function startNextRound() {
    const nextCards = [...forgottenThisRound];
    for (let i = nextCards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [nextCards[i], nextCards[j]] = [nextCards[j], nextCards[i]];
    }
    setCurrentCards(nextCards);
    setForgottenThisRound([]);
    setFailedIds(new Set());
    setRoundRemembered(0);
    setIndex(0);
    setView("reviewing");
    setRound((r) => r + 1);
    setResetKey((k) => k + 1);
  }

  if (view === "results") {
    const forgotCount = forgottenThisRound.length;
    const allDone = forgotCount === 0;

    return (
      <div className="flex flex-col items-center justify-center py-16 gap-6 text-center">
        {allDone
          ? <Sparkles className="w-14 h-14 text-emerald-500" />
          : <CheckCircle2 className="w-14 h-14 text-emerald-500" />
        }
        <h2 className="text-2xl font-bold text-foreground">
          {allDone ? "全部記得！" : "這輪練習完成！"}
        </h2>
        <div className="flex gap-6">
          <div className="flex flex-col items-center">
            <span className="text-3xl font-bold text-emerald-600">{roundRemembered}</span>
            <span className="text-sm text-muted-foreground">記得</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-3xl font-bold text-red-500">{forgotCount}</span>
            <span className="text-sm text-muted-foreground">忘記</span>
          </div>
        </div>
        {!allDone && (
          <Button
            className="px-8 bg-emerald-500 hover:bg-emerald-600 text-white active:scale-[0.98] transition-transform"
            onClick={startNextRound}
          >
            <RotateCcw className="w-4 h-4 mr-1" />再練忘記的句子 ({forgotCount})
          </Button>
        )}
        <Button
          variant={allDone ? "default" : "ghost"}
          className={`active:scale-[0.98] transition-transform ${allDone ? "px-8 bg-emerald-500 hover:bg-emerald-600 text-white" : "text-muted-foreground"}`}
          onClick={() => router.push(backUrl)}
        >
          回到{categoryName}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-8">
      <div className="w-full flex items-center justify-between">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{language.name} · 練習</span>
            {round > 1 && (
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                第 {round} 輪
              </span>
            )}
          </div>
          <span className="font-bold text-foreground">
            {index + 1} / {currentCards.length}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={() => router.push(backUrl)}
        >
          離開
        </Button>
      </div>
      <Progress value={((index + 1) / currentCards.length) * 100} className="w-full [&>div]:bg-emerald-500" />
      <FlashCard
        key={`${index}-${resetKey}`}
        card={{ ...current, front: current.back, back: current.front }}
        ttsCode={language.ttsCode}
        isAnswering={false}
        onRemembered={() => handleAnswer(true)}
        onForgot={() => handleAnswer(false)}
      />
    </div>
  );
}
