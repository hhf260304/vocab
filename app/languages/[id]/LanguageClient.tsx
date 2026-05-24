// app/languages/[id]/LanguageClient.tsx
"use client";

import Link from "next/link";
import type { Language } from "@/lib/db/schema";

interface Props {
  language: Language;
  vocabReviewCount: number;
  vocabTotal: number;
  sentenceReviewCount: number;
  sentenceTotal: number;
}

export default function LanguageClient({
  language,
  vocabReviewCount,
  vocabTotal,
  sentenceReviewCount,
  sentenceTotal,
}: Props) {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-foreground">{language.name}</h1>

      <Link
        href={`/languages/${language.id}/vocabulary`}
        className="block bg-primary/10 border border-primary/20 rounded-2xl p-5 hover:bg-primary/15 hover:border-primary/40 transition-all active:scale-[0.99]"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-foreground text-lg">📚 單字管理</p>
            <p className="text-sm text-muted-foreground mt-0.5">分類 · 新增 · 複習</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-primary">{vocabTotal}</p>
            <p className="text-xs text-muted-foreground">個單字</p>
          </div>
        </div>
        <div className="mt-3 bg-primary/20 rounded-lg px-3 py-1.5 text-sm text-primary font-medium text-center">
          {vocabReviewCount > 0 ? `待複習 ${vocabReviewCount} 個 →` : "目前無待複習"}
        </div>
      </Link>

      <Link
        href={`/languages/${language.id}/sentences`}
        className="block bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-5 hover:bg-emerald-500/15 hover:border-emerald-500/40 transition-all active:scale-[0.99]"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-foreground text-lg">💬 句子管理</p>
            <p className="text-sm text-emerald-600/60 mt-0.5">分類 · 新增 · 複習</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-emerald-500">{sentenceTotal}</p>
            <p className="text-xs text-emerald-600/60">個句子</p>
          </div>
        </div>
        <div className="mt-3 bg-emerald-500/20 rounded-lg px-3 py-1.5 text-sm text-emerald-600 dark:text-emerald-400 font-medium text-center">
          {sentenceReviewCount > 0 ? `待複習 ${sentenceReviewCount} 個 →` : "目前無待複習"}
        </div>
      </Link>
    </div>
  );
}
