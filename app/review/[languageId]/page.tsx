// app/review/[languageId]/page.tsx
import { notFound } from "next/navigation";
import ReviewClient from "./ReviewClient";
import { getLanguageById } from "@/lib/actions/languages";
import { getTodayReviews } from "@/lib/actions/vocabulary";
import { getCategories } from "@/lib/actions/categories";

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ languageId: string }>;
}) {
  const { languageId } = await params;
  const [language, queue, cats] = await Promise.all([
    getLanguageById(languageId),
    getTodayReviews(languageId),
    getCategories(languageId),
  ]);

  if (!language) notFound();

  const categoryMap = Object.fromEntries(cats.map((c) => [c.id, c.name]));

  return <ReviewClient queue={queue} language={language} categoryMap={categoryMap} />;
}
