"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Vocabulary } from "@/lib/db/schema";

interface Props {
  vocab: Vocabulary;
  ttsCode?: string;
  onDelete: () => void;
}

const STAGE_LABELS = ["新", "第1次", "第2次", "第3次", "第4次", "畢業"];

function formatDate(date: Date | string | null): string {
  if (!date) return "-";
  const d = new Date(date);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

export default function VocabCard({ vocab, ttsCode, onDelete }: Props) {
  function speak() {
    if (!ttsCode) return;
    const utterance = new SpeechSynthesisUtterance(vocab.back);
    utterance.lang = ttsCode;
    speechSynthesis.speak(utterance);
  }

  return (
    <Card>
      <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-lg font-bold text-foreground">
              {vocab.back}
            </span>
            <span className="text-sm font-medium text-primary">
              {vocab.front}
            </span>
            {ttsCode && (
              <button
                onClick={speak}
                className="text-muted-foreground hover:text-foreground transition-colors text-base leading-none"
                aria-label="播放發音"
              >
                🔊
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {vocab.reviewStage > 0 && (
              <Badge variant="secondary" className="text-xs">
                {STAGE_LABELS[vocab.reviewStage]}
              </Badge>
            )}
<span className="text-xs text-muted-foreground">
              新增 {formatDate(vocab.createdAt)}
            </span>
            <span className="text-xs text-muted-foreground">
              複習 {formatDate(vocab.nextReviewAt)}
            </span>
          </div>
        </div>
        <div className="flex gap-2 shrink-0 self-end sm:self-auto">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/vocabulary/${vocab.id}`}>編輯</Link>
          </Button>
          <Button variant="destructive" size="sm" onClick={onDelete}>
            刪除
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
