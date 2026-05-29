import { notFound } from "next/navigation";
import TomorrowVocabClient from "./TomorrowVocabClient";
import { getLanguageById } from "@/lib/actions/languages";
import { getTomorrowVocabReviews } from "@/lib/actions/vocabulary";

export default async function TomorrowVocabPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [language, items] = await Promise.all([
    getLanguageById(id),
    getTomorrowVocabReviews(id),
  ]);

  if (!language) notFound();

  return <TomorrowVocabClient language={language} items={items} />;
}
