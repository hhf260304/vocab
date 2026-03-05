// app/vocabulary/page.tsx
import { getCategories } from "@/lib/actions/categories";
import { getLanguages } from "@/lib/actions/languages";
import { getVocabularies } from "@/lib/actions/vocabulary";
import VocabularyClient from "./VocabularyClient";

export default async function VocabularyPage({
  searchParams,
}: {
  searchParams: Promise<{ languageId?: string }>;
}) {
  const { languageId } = await searchParams;
  const [categories, languages, vocabularies] = await Promise.all([
    getCategories(),
    getLanguages(),
    getVocabularies(languageId),
  ]);

  return (
    <VocabularyClient
      initialCategories={categories}
      initialVocabularies={vocabularies}
      languages={languages}
      currentLanguageId={languageId ?? null}
    />
  );
}
