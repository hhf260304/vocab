// app/review/[languageId]/page.tsx
import { notFound } from "next/navigation";
import ReviewClient from "./ReviewClient";
import { getLanguageById } from "@/lib/actions/languages";
import { getTodayReviews } from "@/lib/actions/vocabulary";

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ languageId: string }>;
}) {
  const { languageId } = await params;
  const [language, queue] = await Promise.all([
    getLanguageById(languageId),
    getTodayReviews(languageId),
  ]);

  if (!language) notFound();

  return <ReviewClient queue={queue} language={language} />;
}
