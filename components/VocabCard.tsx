"use client";

import { Pencil, Trash2, Volume2 } from "lucide-react";
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

const STAGE_LABELS = ["新", "Lv.1", "Lv.2", "Lv.3", "Lv.4", "Lv.5", "已畢業"];

function getStageStyle(stage: number): string {
  if (stage === 0) return "bg-sky-50 text-sky-600 border-sky-200";
  if (stage === 6) return "bg-emerald-50 text-emerald-600 border-emerald-200";
  return "bg-indigo-50 text-indigo-600 border-indigo-200";
}

function formatRelativeDate(date: Date | string | null): string {
  if (!date) return "";
  const target = new Date(date);
  const now = new Date();
  // 比較日期（去掉時間部分）
  target.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((target.getTime() - now.getTime()) / 86400000);
  if (diffDays <= 0) return "待複習";
  if (diffDays === 1) return "明日複習";
  return `${diffDays} 天後複習`;
}

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

  const relativeReview = vocab.reviewStage < 6 ? formatRelativeDate(vocab.nextReviewAt) : null;

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
                className="text-muted-foreground hover:text-foreground transition-colors leading-none cursor-pointer"
                aria-label="播放發音"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <Badge variant="outline" className={`text-xs ${getStageStyle(vocab.reviewStage)}`}>
              {STAGE_LABELS[vocab.reviewStage]}
            </Badge>
            {relativeReview && (
              <span className={`text-xs font-medium ${relativeReview === "待複習" ? "text-amber-600" : "text-muted-foreground"}`}>
                {relativeReview}
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              新增 {formatDate(vocab.createdAt)}
            </span>
          </div>
        </div>
        <div className="flex gap-2 shrink-0 self-end sm:self-auto">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/vocabulary/${vocab.id}`}><Pencil className="w-3.5 h-3.5 mr-1" />編輯</Link>
          </Button>
          <Button variant="destructive" size="sm" onClick={onDelete}>
            <Trash2 className="w-3.5 h-3.5 mr-1" />刪除
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
