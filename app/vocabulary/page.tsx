// app/vocabulary/page.tsx
import { getCategories } from "@/lib/actions/categories";
import { getVocabularies } from "@/lib/actions/vocabulary";
import VocabularyClient from "./VocabularyClient";

export default async function VocabularyPage() {
  const [categories, vocabularies] = await Promise.all([
    getCategories(),
    getVocabularies(),
  ]);

  return (
    <VocabularyClient
      initialCategories={categories}
      initialVocabularies={vocabularies}
    />
  );
}
