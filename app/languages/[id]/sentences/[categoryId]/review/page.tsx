import { notFound } from "next/navigation";
import { getLanguageById } from "@/lib/actions/languages";
import { getCategories } from "@/lib/actions/categories";
import { getSentences } from "@/lib/actions/sentences";
import SentencePracticeClient from "./SentencePracticeClient";

export default async function SentencePracticeReviewPage({
  params,
}: {
  params: Promise<{ id: string; categoryId: string }>;
}) {
  const { id, categoryId } = await params;
  const [language, categories, sentenceList] = await Promise.all([
    getLanguageById(id),
    getCategories(id, "sentence"),
    getSentences(id, categoryId),
  ]);

  if (!language) notFound();

  const categoryName =
    categoryId === "uncategorized"
      ? "未分類"
      : categories.find((c) => c.id === categoryId)?.name;

  if (!categoryName) notFound();

  return (
    <SentencePracticeClient
      sentences={sentenceList}
      language={language}
      categoryId={categoryId}
      categoryName={categoryName}
    />
  );
}
