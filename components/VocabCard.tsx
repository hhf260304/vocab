"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Category, Vocabulary } from "@/lib/db/schema";
import CategoryTag from "./CategoryTag";

interface Props {
  vocab: Vocabulary;
  categories: Category[];
  onDelete: () => void;
}

const STAGE_LABELS = ["新", "第1次", "第2次", "第3次", "第4次", "畢業"];

export default function VocabCard({ vocab, categories, onDelete }: Props) {
  const vocabCategory = categories.find((c) => c.id === vocab.categoryId);

  return (
    <Card>
      <CardContent className="p-4 flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-lg font-bold text-foreground">
              {vocab.back}
            </span>
            <span className="text-sm font-medium text-primary">
              {vocab.front}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <Badge variant="secondary" className="text-xs">
              {STAGE_LABELS[vocab.reviewStage]}
            </Badge>
            {vocabCategory && (
              <CategoryTag key={vocabCategory.id} category={vocabCategory} />
            )}
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
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
