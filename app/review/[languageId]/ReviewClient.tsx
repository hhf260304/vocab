// app/review/[languageId]/ReviewClient.tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import FlashCard from "@/components/FlashCard";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { markReview } from "@/lib/actions/vocabulary";
import type { Language, Vocabulary } from "@/lib/db/schema";

export default function ReviewClient({
  queue,
  language,
}: {
  queue: Vocabulary[];
  language: Language;
}) {
  const router = useRouter();
  const originalTotal = queue.length;
  const [cards, setCards] = useState<Vocabulary[]>(() => {
    const shuffled = [...queue];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  });
  const [index, setIndex] = useState(0);
  const [failedIds, setFailedIds] = useState<Set<string>>(new Set());
  const [completedCount, setCompletedCount] = useState(0);
  const [results, setResults] = useState({ remembered: 0, forgot: 0 });
  const [done, setDone] = useState(false);

  const current = cards[index];

  async function handleAnswer(remembered: boolean) {
    const currentId = current.id;

    if (!remembered) {
      setFailedIds((prev) => new Set(prev).add(currentId));
      setCards((prev) => [...prev, current]);
      setIndex((i) => i + 1);
    } else {
      const wasEverFailed = failedIds.has(currentId);
      await markReview(currentId, !wasEverFailed);
      setCompletedCount((c) => c + 1);
      setResults((r) => ({
        remembered: r.remembered + (wasEverFailed ? 0 : 1),
        forgot: r.forgot + (wasEverFailed ? 1 : 0),
      }));
      if (index + 1 >= cards.length) {
        setDone(true);
      } else {
        setIndex((i) => i + 1);
      }
    }
  }

  if (originalTotal === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <p className="text-5xl">🎉</p>
        <h2 className="text-xl font-bold text-foreground">
          今日沒有待複習單字
        </h2>
        <Button
          variant="link"
          className="text-primary"
          onClick={() => router.push(`/languages/${language.id}`)}
        >
          回到{language.name}
        </Button>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-6 text-center">
        <p className="text-5xl">✅</p>
        <h2 className="text-2xl font-bold text-foreground">複習完成！</h2>
        <div className="flex gap-6">
          <div className="flex flex-col items-center">
            <span className="text-3xl font-bold text-emerald-600">
              {results.remembered}
            </span>
            <span className="text-sm text-muted-foreground">記得</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-3xl font-bold text-red-500">
              {results.forgot}
            </span>
            <span className="text-sm text-muted-foreground">忘記</span>
          </div>
        </div>
        <Button
          className="px-8"
          onClick={() => router.push(`/languages/${language.id}`)}
        >
          回到{language.name}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-8">
      <div className="w-full flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-sm text-muted-foreground">{language.name} 進度</span>
          <span className="font-bold text-foreground">
            {completedCount + 1} / {originalTotal}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={() => router.push(`/languages/${language.id}`)}
        >
          離開
        </Button>
      </div>
      <Progress value={(completedCount / originalTotal) * 100} className="w-full" />
      <FlashCard
        key={index}
        vocab={current}
        ttsCode={language.ttsCode}
        onRemembered={() => handleAnswer(true)}
        onForgot={() => handleAnswer(false)}
      />
    </div>
  );
}
