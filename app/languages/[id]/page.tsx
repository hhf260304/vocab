// app/languages/[id]/page.tsx
import { notFound } from "next/navigation";
import LanguageClient from "./LanguageClient";
import { getCategories } from "@/lib/actions/categories";
import { getLanguageById } from "@/lib/actions/languages";
import {
  getVocabularyCounts,
  getCategoryVocabCounts,
  getTodayReviews,
} from "@/lib/actions/vocabulary";

export default async function LanguagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [language, reviews, counts, vocabCounts, categories] = await Promise.all([
    getLanguageById(id),
    getTodayReviews(id),
    getVocabularyCounts(id),
    getCategoryVocabCounts(id),
    getCategories(id),
  ]);

  if (!language) notFound();

  return (
    <LanguageClient
      language={language}
      reviewCount={reviews.length}
      totalCount={counts.total}
      graduatedCount={counts.graduated}
      initialCategories={categories}
      vocabCounts={vocabCounts}
    />
  );
}
