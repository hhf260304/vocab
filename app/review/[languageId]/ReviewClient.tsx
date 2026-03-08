// app/review/[languageId]/ReviewClient.tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import FlashCard from "@/components/FlashCard";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Trash2 } from "lucide-react";
import { markReview, deleteVocabulary } from "@/lib/actions/vocabulary";
import type { Language, Vocabulary } from "@/lib/db/schema";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function ReviewClient({
  queue,
  language,
  categoryMap,
}: {
  queue: Vocabulary[];
  language: Language;
  categoryMap: Record<string, string>;
}) {
  const router = useRouter();
  const [currentCards, setCurrentCards] = useState<Vocabulary[]>(() => {
    const shuffled = [...queue];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  });
  const [index, setIndex] = useState(0);
  const [failedIds, setFailedIds] = useState<Set<string>>(new Set());
  // Full objects needed to seed the next round via setCurrentCards(shuffle(forgottenThisRound))
  const [forgottenThisRound, setForgottenThisRound] = useState<Vocabulary[]>([]);
  const [roundRemembered, setRoundRemembered] = useState(0);
  const [view, setView] = useState<"reviewing" | "results">("reviewing");

  const current = currentCards[index];

  async function handleDelete() {
    if (!current) return;
    const idToDelete = current.id;
    await deleteVocabulary(idToDelete);
    const newCards = currentCards.filter((c) => c.id !== idToDelete);
    setForgottenThisRound((prev) => prev.filter((c) => c.id !== idToDelete));
    if (newCards.length === 0) {
      setView("results");
      return;
    }
    const newIndex = index >= newCards.length ? newCards.length - 1 : index;
    setCurrentCards(newCards);
    setIndex(newIndex);
  }

  async function handleAnswer(remembered: boolean) {
    if (!current) return;
    const currentCard = current;
    const nextIndex = index + 1;
    const isLastCard = nextIndex >= currentCards.length;

    if (!remembered) {
      setFailedIds((prev) => new Set(prev).add(currentCard.id));
      setForgottenThisRound((prev) => [...prev, currentCard]);
    } else {
      await markReview(currentCard.id, !failedIds.has(currentCard.id));
      setRoundRemembered((n) => n + 1);
    }

    if (isLastCard) {
      setView("results");
    } else {
      setIndex(nextIndex);
    }
  }

  function startNextRound() {
    const nextCards = [...forgottenThisRound];
    for (let i = nextCards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [nextCards[i], nextCards[j]] = [nextCards[j], nextCards[i]];
    }
    setCurrentCards(nextCards);
    setForgottenThisRound([]);
    setRoundRemembered(0);
    setIndex(0);
    setView("reviewing");
  }

  if (queue.length === 0) {
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

  if (view === "results") {
    const forgotCount = forgottenThisRound.length;
    const allDone = forgotCount === 0;

    return (
      <div className="flex flex-col items-center justify-center py-16 gap-6 text-center">
        <p className="text-5xl">{allDone ? "🎉" : "✅"}</p>
        <h2 className="text-2xl font-bold text-foreground">
          {allDone ? "全部記得！" : "這輪複習完成！"}
        </h2>
        <div className="flex gap-6">
          <div className="flex flex-col items-center">
            <span className="text-3xl font-bold text-emerald-600">
              {roundRemembered}
            </span>
            <span className="text-sm text-muted-foreground">記得</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-3xl font-bold text-red-500">
              {forgotCount}
            </span>
            <span className="text-sm text-muted-foreground">忘記</span>
          </div>
        </div>
        {!allDone && (
          <Button className="px-8" onClick={startNextRound}>
            複習忘記的字 ({forgotCount})
          </Button>
        )}
        <Button
          variant={allDone ? "default" : "ghost"}
          className={allDone ? "px-8" : "text-muted-foreground"}
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
        <div className="flex items-center gap-3">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-red-500 h-8 w-8">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>刪除單字？</AlertDialogTitle>
                <AlertDialogDescription>
                  「{current.front}」將被永久刪除，無法復原。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>取消</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-red-600 hover:bg-red-700"
                  onClick={handleDelete}
                >
                  刪除
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <div className="flex flex-col">
            <span className="text-sm text-muted-foreground">{language.name} 進度</span>
            <span className="font-bold text-foreground">
              {index} / {currentCards.length}
            </span>
          </div>
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
      <Progress value={(index / currentCards.length) * 100} className="w-full" />
      <FlashCard
        key={index}
        vocab={current}
        ttsCode={language.ttsCode}
        categoryName={current.categoryId ? categoryMap[current.categoryId] : undefined}
        onRemembered={() => handleAnswer(true)}
        onForgot={() => handleAnswer(false)}
      />
    </div>
  );
}
