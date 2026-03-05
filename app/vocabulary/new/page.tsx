// app/vocabulary/new/page.tsx
import { Suspense } from "react";
import NewVocabPageInner from "./NewVocabPageInner";

export default async function NewVocabPage({
  searchParams,
}: {
  searchParams: Promise<{ languageId?: string; categoryId?: string }>;
}) {
  const { languageId } = await searchParams;
  return (
    <Suspense>
      <NewVocabPageInner languageId={languageId} />
    </Suspense>
  );
}
