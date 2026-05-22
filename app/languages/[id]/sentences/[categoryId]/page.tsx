// app/languages/[id]/sentences/[categoryId]/page.tsx
import { notFound } from "next/navigation";
import SentenceCategoryClient from "./SentenceCategoryClient";
import { getLanguageById } from "@/lib/actions/languages";
import { getCategories } from "@/lib/actions/categories";
import { getSentences } from "@/lib/actions/sentences";

export default async function SentenceCategoryPage({
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
    <SentenceCategoryClient
      language={language}
      categoryId={categoryId}
      categoryName={categoryName}
      categories={categories}
      initialSentences={sentenceList}
    />
  );
}
