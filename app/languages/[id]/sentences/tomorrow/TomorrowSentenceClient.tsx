"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Language } from "@/lib/db/schema";
import type { TomorrowSentenceItem } from "@/lib/actions/sentences";

interface Props {
  language: Language;
  items: TomorrowSentenceItem[];
}

export default function TomorrowSentenceClient({ language, items }: Props) {
  const groups: Record<string, TomorrowSentenceItem[]> = {};
  for (const item of items) {
    const key = item.categoryName ?? "未分類";
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 text-muted-foreground"
          asChild
        >
          <Link href={`/languages/${language.id}/sentences`}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            返回
          </Link>
        </Button>
        {items.length > 0 && (
          <span className="bg-emerald-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
            {items.length} 個
          </span>
        )}
      </div>

      <div>
        <h1 className="text-2xl font-bold text-foreground">明天的複習預覽</h1>
        <p className="text-sm text-emerald-600/70 dark:text-emerald-400/70 mt-1">{language.name}</p>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg font-medium">明天沒有待複習的項目 🎉</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {Object.entries(groups)
            .sort(([a], [b]) => {
              if (a === "未分類") return -1;
              if (b === "未分類") return 1;
              return a.localeCompare(b);
            })
            .map(([categoryName, groupItems]) => (
              <div key={categoryName} className="flex flex-col gap-3">
                <h2 className="text-sm font-semibold text-emerald-600/70 dark:text-emerald-400/70">
                  {categoryName}（{groupItems.length} 個）
                </h2>
                {groupItems.map((item) => (
                  <div
                    key={item.id}
                    className="bg-card border border-emerald-500/20 rounded-2xl p-4 flex flex-col gap-1"
                  >
                    <p className="font-bold text-foreground">{item.front}</p>
                    <p className="text-sm text-emerald-600 dark:text-emerald-400">{item.back}</p>
                  </div>
                ))}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
