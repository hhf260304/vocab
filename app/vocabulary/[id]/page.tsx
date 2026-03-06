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
  const [vocab, languages] = await Promise.all([
    getVocabularyById(id),
    getLanguages(),
  ]);

  if (!vocab) notFound();

  const categories = vocab.languageId
    ? await getCategories(vocab.languageId)
    : [];

  return (
    <EditVocabClient vocab={vocab} categories={categories} languages={languages} />
  );
}
