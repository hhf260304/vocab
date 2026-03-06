// app/vocabulary/new/NewVocabPageInner.tsx
import { getCategories } from "@/lib/actions/categories";
import { getLanguages } from "@/lib/actions/languages";
import NewVocabClient from "./NewVocabClient";

export default async function NewVocabPageInner({
  languageId,
  categoryId,
}: {
  languageId?: string;
  categoryId?: string;
}) {
  const [categories, languages] = await Promise.all([
    languageId ? getCategories(languageId) : Promise.resolve([]),
    getLanguages(),
  ]);
  return (
    <NewVocabClient
      categories={categories}
      languages={languages}
      defaultLanguageId={languageId ?? null}
      defaultCategoryId={categoryId ?? null}
    />
  );
}
