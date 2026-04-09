// components/LanguageCard.tsx
import Link from "next/link";
import type { Language } from "@/lib/db/schema";

interface Props {
  language: Language;
  reviewCount: number;
  totalCount: number;
}

export default function LanguageCard({ language, reviewCount, totalCount }: Props) {
  return (
    <Link href={`/languages/${language.id}`}>
      <div className="bg-card border border-border rounded-2xl p-5 hover:border-primary/40 hover:shadow-md transition-all cursor-pointer active:scale-[0.99]">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-foreground">{language.name}</h2>
          {reviewCount > 0 && (
            <span className="bg-primary text-primary-foreground text-xs font-bold px-2.5 py-1 rounded-full">
              {reviewCount}
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {totalCount} 個單字
          {reviewCount > 0
            ? `・${reviewCount} 個待複習`
            : totalCount > 0
            ? "・今日已完成"
            : ""}
        </p>
      </div>
    </Link>
  );
}
