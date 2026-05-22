// app/languages/[id]/page.tsx
import { notFound } from "next/navigation";
import LanguageClient from "./LanguageClient";
import { getLanguageById } from "@/lib/actions/languages";
import { getVocabularyCounts, getTodayReviews } from "@/lib/actions/vocabulary";
import { getSentenceCounts, getTodaySentenceReviews } from "@/lib/actions/sentences";

export default async function LanguagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [language, vocabReviews, vocabCounts, sentenceCounts, sentenceReviews] =
    await Promise.all([
      getLanguageById(id),
      getTodayReviews(id),
      getVocabularyCounts(id),
      getSentenceCounts(id),
      getTodaySentenceReviews(id),
    ]);

  if (!language) notFound();

  return (
    <LanguageClient
      language={language}
      vocabReviewCount={vocabReviews.length}
      vocabTotal={vocabCounts.total}
      sentenceReviewCount={sentenceReviews.length}
      sentenceTotal={sentenceCounts.total}
    />
  );
}
