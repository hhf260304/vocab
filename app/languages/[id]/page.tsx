// app/languages/[id]/page.tsx
import { notFound } from "next/navigation";
import LanguageClient from "./LanguageClient";
import { getLanguageById } from "@/lib/actions/languages";
import { getVocabularies, getTodayReviews } from "@/lib/actions/vocabulary";

export default async function LanguagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [language, allVocab, reviews] = await Promise.all([
    getLanguageById(id),
    getVocabularies(id),
    getTodayReviews(id),
  ]);

  if (!language) notFound();

  const graduatedCount = allVocab.filter((v) => v.reviewStage === 5).length;

  return (
    <LanguageClient
      language={language}
      reviewCount={reviews.length}
      totalCount={allVocab.length}
      graduatedCount={graduatedCount}
    />
  );
}
