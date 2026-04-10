import { notFound } from "next/navigation";
import Link from "next/link";
import { getLanguageById } from "@/lib/actions/languages";
import { getFailStats } from "@/lib/actions/vocabulary";
import { Button } from "@/components/ui/button";
import { ChevronLeft, BarChart2 } from "lucide-react";

export default async function StatsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [language, stats] = await Promise.all([
    getLanguageById(id),
    getFailStats(id),
  ]);

  if (!language) notFound();

  return (
    <div className="flex flex-col gap-6">
      {/* 頂部導航 */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" className="text-muted-foreground px-0" asChild>
          <Link href={`/languages/${id}`}>
            <ChevronLeft className="w-4 h-4 mr-1" />
            {language.name}
          </Link>
        </Button>
      </div>

      {/* 標題 */}
      <div className="flex items-center gap-2">
        <BarChart2 className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">錯誤排行榜</h1>
      </div>

      {/* 內容 */}
      {stats.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
          <BarChart2 className="w-12 h-12 text-muted-foreground/40" />
          <p className="text-muted-foreground">還沒有錯誤紀錄</p>
          <p className="text-sm text-muted-foreground/60">複習時答錯的單字會出現在這裡</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {stats.map((item, index) => (
            <div
              key={item.id}
              className="bg-card border border-border rounded-2xl px-5 py-3.5 flex items-center gap-4"
            >
              {/* 排名 */}
              <span className="text-sm font-bold text-muted-foreground w-6 shrink-0 text-center">
                {index + 1}
              </span>

              {/* 單字 */}
              <div className="flex flex-col min-w-0 flex-1">
                <span className="font-semibold text-foreground truncate">{item.front}</span>
                <span className="text-sm text-muted-foreground truncate">{item.back}</span>
              </div>

              {/* 分類標籤 */}
              {item.categoryName && (
                <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full shrink-0">
                  {item.categoryName}
                </span>
              )}

              {/* 錯誤次數 */}
              <span className="text-sm font-bold text-destructive shrink-0">
                {item.failCount} 次
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
