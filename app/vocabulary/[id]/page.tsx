// app/vocabulary/[id]/page.tsx
import { notFound } from "next/navigation";
import { getCategories } from "@/lib/actions/categories";
import { getVocabularyById } from "@/lib/actions/vocabulary";
import EditVocabClient from "./EditVocabClient";

export default async function EditVocabPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [vocab, categories] = await Promise.all([
    getVocabularyById(id),
    getCategories(),
  ]);

  if (!vocab) notFound();

  return <EditVocabClient vocab={vocab} categories={categories} />;
}
