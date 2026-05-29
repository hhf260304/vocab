import { notFound } from "next/navigation";
import TomorrowSentenceClient from "./TomorrowSentenceClient";
import { getLanguageById } from "@/lib/actions/languages";
import { getTomorrowSentenceReviews } from "@/lib/actions/sentences";

export default async function TomorrowSentencePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [language, items] = await Promise.all([
    getLanguageById(id),
    getTomorrowSentenceReviews(id),
  ]);

  if (!language) notFound();

  return <TomorrowSentenceClient language={language} items={items} />;
}
