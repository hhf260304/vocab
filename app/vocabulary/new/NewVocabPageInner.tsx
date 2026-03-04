// app/vocabulary/new/NewVocabPageInner.tsx
import { getCategories } from "@/lib/actions/categories";
import NewVocabClient from "./NewVocabClient";

export default async function NewVocabPageInner() {
  const categories = await getCategories();
  return <NewVocabClient categories={categories} />;
}
