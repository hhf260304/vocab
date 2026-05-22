// app/languages/[id]/vocabulary/page.tsx
import { notFound } from "next/navigation";
import VocabularyClient from "./VocabularyClient";
import { getLanguageById } from "@/lib/actions/languages";
import { getCategories } from "@/lib/actions/categories";
import {
  getVocabularyCounts,
  getCategoryVocabCounts,
  getTodayReviews,
} from "@/lib/actions/vocabulary";

export default async function VocabularyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [language, reviews, counts, vocabCounts, initialCategories] =
    await Promise.all([
      getLanguageById(id),
      getTodayReviews(id),
      getVocabularyCounts(id),
      getCategoryVocabCounts(id),
      getCategories(id, "vocab"),
    ]);

  if (!language) notFound();

  return (
    <VocabularyClient
      language={language}
      reviewCount={reviews.length}
      totalCount={counts.total}
      graduatedCount={counts.graduated}
      initialCategories={initialCategories}
      vocabCounts={vocabCounts}
    />
  );
}
