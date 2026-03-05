// app/vocabulary/[id]/page.tsx
import { notFound } from "next/navigation";
import EditVocabClient from "./EditVocabClient";
import { getCategories } from "@/lib/actions/categories";
import { getLanguages } from "@/lib/actions/languages";
import { getVocabularyById } from "@/lib/actions/vocabulary";

export default async function EditVocabPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [vocab, categories, languages] = await Promise.all([
    getVocabularyById(id),
    getCategories(),
    getLanguages(),
  ]);

  if (!vocab) notFound();

  return (
    <EditVocabClient vocab={vocab} categories={categories} languages={languages} />
  );
}
