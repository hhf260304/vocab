// app/sentences/[languageId]/review/page.tsx
import { notFound } from "next/navigation";
import { getLanguageById } from "@/lib/actions/languages";
import { getCategories } from "@/lib/actions/categories";
import { getTodaySentenceReviews } from "@/lib/actions/sentences";
import SentenceReviewClient from "./SentenceReviewClient";

export default async function SentenceReviewPage({
  params,
}: {
  params: Promise<{ languageId: string }>;
}) {
  const { languageId } = await params;
  const [language, queue, categories] = await Promise.all([
    getLanguageById(languageId),
    getTodaySentenceReviews(languageId),
    getCategories(languageId),
  ]);

  if (!language) notFound();

  const categoryMap = Object.fromEntries(categories.map((c) => [c.id, c.name]));

  return (
    <SentenceReviewClient
      queue={queue}
      language={language}
      categoryMap={categoryMap}
    />
  );
}
