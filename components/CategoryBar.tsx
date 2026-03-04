// components/CategoryBar.tsx
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { Category, Vocabulary } from "@/lib/db/schema";

export default function CategoryBar({
  categories,
  vocabularies,
}: {
  categories: Category[];
  vocabularies: Vocabulary[];
}) {
  if (categories.length === 0) return null;

  return (
    <Card>
      <CardContent className="p-5">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
          分類進度
        </h2>
        <div className="flex flex-col gap-3">
          {categories.map((cat) => {
            const catVocabs = vocabularies.filter((v) => v.categoryId === cat.id);
            const graduated = catVocabs.filter((v) => v.reviewStage === 5).length;
            const total = catVocabs.length;
            const pct = total === 0 ? 0 : Math.round((graduated / total) * 100);

            return (
              <div key={cat.id}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="font-medium text-foreground">{cat.name}</span>
                  <span className="text-muted-foreground">{graduated}/{total}</span>
                </div>
                <Progress value={pct} className="h-2" />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
