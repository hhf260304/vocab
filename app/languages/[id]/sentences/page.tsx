// app/languages/[id]/sentences/page.tsx
import { notFound } from "next/navigation";
import SentencesClient from "./SentencesClient";
import { getLanguageById } from "@/lib/actions/languages";
import { getCategories } from "@/lib/actions/categories";
import {
  getSentenceCounts,
  getTodaySentenceReviews,
  getCategorySentenceCounts,
  getTomorrowSentenceReviews,
} from "@/lib/actions/sentences";

export default async function SentencesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [language, sentenceCounts, sentenceReviews, initialCategories, categoryCounts, tomorrowItems] =
    await Promise.all([
      getLanguageById(id),
      getSentenceCounts(id),
      getTodaySentenceReviews(id),
      getCategories(id, "sentence"),
      getCategorySentenceCounts(id),
      getTomorrowSentenceReviews(id),
    ]);

  if (!language) notFound();

  return (
    <SentencesClient
      language={language}
      totalCount={sentenceCounts.total}
      reviewCount={sentenceReviews.length}
      initialCategories={initialCategories}
      categoryCounts={categoryCounts}
      tomorrowCount={tomorrowItems.length}
    />
  );
}
