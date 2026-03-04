// app/page.tsx
import Link from "next/link";
import CategoryBar from "@/components/CategoryBar";
import StatsCard from "@/components/StatsCard";
import { Button } from "@/components/ui/button";
import { getCategories } from "@/lib/actions/categories";
import { getVocabularies, getTodayReviews } from "@/lib/actions/vocabulary";

export default async function DashboardPage() {
  const [vocabularies, todayReviews, categories] = await Promise.all([
    getVocabularies(),
    getTodayReviews(),
    getCategories(),
  ]);

  const graduated = vocabularies.filter((v) => v.reviewStage === 5).length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">今日複習</h1>
        <p className="text-muted-foreground text-sm mt-1">保持每日練習，記憶更牢固</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatsCard label="待複習" value={todayReviews.length} highlight />
        <StatsCard label="總單字" value={vocabularies.length} />
        <StatsCard label="已畢業" value={graduated} />
      </div>

      {todayReviews.length > 0 ? (
        <Button size="lg" className="w-full text-lg py-7" asChild>
          <Link href="/review">開始複習（{todayReviews.length} 個）</Link>
        </Button>
      ) : (
        <Button size="lg" className="w-full text-lg py-7" disabled>
          今日無待複習單字
        </Button>
      )}

      <CategoryBar categories={categories} vocabularies={vocabularies} />
    </div>
  );
}
