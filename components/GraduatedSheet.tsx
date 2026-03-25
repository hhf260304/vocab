"use client";

import { useState, useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { getGraduatedVocab, type GraduatedVocab } from "@/lib/actions/vocabulary";

interface GraduatedSheetProps {
  languageId: string;
  totalCount: number;
  children: React.ReactNode; // trigger element
}

type GroupBy = "category" | "date";

function formatDate(date: Date | null): string {
  if (!date) return "—";
  return date.toLocaleDateString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function GraduatedSheet({
  languageId,
  totalCount,
  children,
}: GraduatedSheetProps) {
  const [open, setOpen] = useState(false);
  const [groupBy, setGroupBy] = useState<GroupBy>("category");
  const [vocab, setVocab] = useState<GraduatedVocab[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  async function handleOpen(isOpen: boolean) {
    setOpen(isOpen);
    if (isOpen && vocab === null) {
      setLoading(true);
      setError(false);
      try {
        const data = await getGraduatedVocab(languageId);
        setVocab(data);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }
  }

  // 依分類分組：{ categoryName: GraduatedVocab[] }，按分類名稱字母排序，null 分類歸「未分類」
  const groupedByCategory = useMemo(() => {
    if (!vocab) return [];
    const map = new Map<string, GraduatedVocab[]>();
    for (const v of vocab) {
      const key = v.categoryName ?? "未分類";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(v);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [vocab]);

  // 依畢業時間降序排列，null 置於最後
  const sortedByDate = useMemo(() => {
    if (!vocab) return [];
    return [...vocab].sort((a, b) => {
      if (!a.lastReviewedAt && !b.lastReviewedAt) return 0;
      if (!a.lastReviewedAt) return 1;
      if (!b.lastReviewedAt) return -1;
      return b.lastReviewedAt.getTime() - a.lastReviewedAt.getTime();
    });
  }, [vocab]);

  return (
    <Sheet open={open} onOpenChange={handleOpen}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent side="right" className="w-full max-w-md p-0 flex flex-col">
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-border">
          <SheetTitle className="text-lg font-bold">已畢業單字</SheetTitle>
          <p className="text-xs text-muted-foreground">共 {totalCount} 個單字</p>
        </SheetHeader>

        {/* Toggle */}
        <div className="flex gap-2 px-5 py-3 border-b border-border">
          <button
            onClick={() => setGroupBy("category")}
            className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              groupBy === "category"
                ? "bg-blue-950 text-blue-400"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            依分類
          </button>
          <button
            onClick={() => setGroupBy("date")}
            className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              groupBy === "date"
                ? "bg-blue-950 text-blue-400"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            依畢業時間
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="p-5 space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          )}

          {error && (
            <div className="p-5 text-center text-sm text-muted-foreground">
              載入失敗，請關閉後再試一次。
            </div>
          )}

          {!loading && !error && vocab !== null && vocab.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">
              還沒有畢業的單字，繼續加油！
            </div>
          )}

          {!loading && !error && vocab !== null && vocab.length > 0 && (
            <>
              {groupBy === "category" &&
                groupedByCategory.map(([categoryName, items]) => (
                  <div key={categoryName}>
                    <div className="px-5 py-2 bg-muted/30 sticky top-0">
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                        {categoryName} · {items.length} 個
                      </span>
                    </div>
                    {items.map((v) => (
                      <VocabRow key={v.id} vocab={v} showCategory={false} />
                    ))}
                  </div>
                ))}

              {groupBy === "date" &&
                sortedByDate.map((v) => (
                  <VocabRow key={v.id} vocab={v} showCategory={true} />
                ))}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function VocabRow({
  vocab,
  showCategory,
}: {
  vocab: GraduatedVocab;
  showCategory: boolean;
}) {
  return (
    <div className="px-5 py-2.5 border-b border-border">
      <div className="flex items-baseline gap-2 min-w-0">
        <span className="text-sm font-semibold text-foreground whitespace-nowrap">
          {vocab.front}
        </span>
        <span className="text-xs text-muted-foreground truncate">{vocab.back}</span>
      </div>
      <div className="flex items-center gap-2 mt-1">
        {showCategory && vocab.categoryName && (
          <Badge variant="secondary" className="text-xs py-0 px-2">
            {vocab.categoryName}
          </Badge>
        )}
        <span className="text-xs text-muted-foreground">
          {formatDate(vocab.lastReviewedAt)}
        </span>
      </div>
    </div>
  );
}
