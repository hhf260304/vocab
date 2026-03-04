// app/review/ReviewClient.tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import FlashCard from "@/components/FlashCard";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { markReview } from "@/lib/actions/vocabulary";
import type { Vocabulary } from "@/lib/db/schema";

export default function ReviewClient({ queue }: { queue: Vocabulary[] }) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState({ remembered: 0, forgot: 0 });
  const [done, setDone] = useState(false);

  const current = queue[index];
  const total = queue.length;

  async function handleAnswer(remembered: boolean) {
    await markReview(current.id, remembered);
    setResults((r) => ({
      remembered: r.remembered + (remembered ? 1 : 0),
      forgot: r.forgot + (remembered ? 0 : 1),
    }));
    if (index + 1 >= total) {
      setDone(true);
    } else {
      setIndex((i) => i + 1);
    }
  }

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <p className="text-5xl">🎉</p>
        <h2 className="text-xl font-bold text-foreground">今日沒有待複習單字</h2>
        <Button variant="link" className="text-primary" onClick={() => router.push("/")}>
          回到首頁
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
            <span className="text-3xl font-bold text-emerald-600">{results.remembered}</span>
            <span className="text-sm text-muted-foreground">記得</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-3xl font-bold text-red-500">{results.forgot}</span>
            <span className="text-sm text-muted-foreground">忘記</span>
          </div>
        </div>
        <Button className="px-8" onClick={() => router.push("/")}>
          回到首頁
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-8">
      <div className="w-full flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-sm text-muted-foreground">進度</span>
          <span className="font-bold text-foreground">{index + 1} / {total}</span>
        </div>
        <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => router.push("/")}>
          離開
        </Button>
      </div>
      <Progress value={(index / total) * 100} className="w-full" />
      <FlashCard
        key={current.id}
        vocab={current}
        onRemembered={() => handleAnswer(true)}
        onForgot={() => handleAnswer(false)}
      />
    </div>
  );
}
