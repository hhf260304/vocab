// app/languages/[id]/categories/[categoryId]/page.tsx
import { notFound } from "next/navigation";
import CategoryClient from "./CategoryClient";
import { getCategories } from "@/lib/actions/categories";
import { getLanguageById } from "@/lib/actions/languages";
import { getVocabularies } from "@/lib/actions/vocabulary";
import type { Category } from "@/lib/db/schema";

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ id: string; categoryId: string }>;
}) {
  const { id, categoryId } = await params;
  const [language, categories, vocabs] = await Promise.all([
    getLanguageById(id),
    getCategories(id),
    getVocabularies(id, categoryId),
  ]);

  if (!language) notFound();

  const isVirtual = categoryId === "uncategorized";
  let cat: Category;

  if (isVirtual) {
    cat = {
      id: "uncategorized",
      name: "未分類",
      languageId: id,
      userId: language.userId,
      createdAt: language.createdAt,
    };
  } else {
    const found = categories.find((c) => c.id === categoryId);
    if (!found) notFound();
    cat = found;
  }

  return (
    <CategoryClient
      language={language}
      category={cat}
      initialVocabularies={vocabs}
      isVirtual={isVirtual}
    />
  );
}
