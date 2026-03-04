// app/vocabulary/new/page.tsx
import { Suspense } from "react";
import NewVocabPageInner from "./NewVocabPageInner";

export default function NewVocabPage() {
  return (
    <Suspense fallback={null}>
      <NewVocabPageInner />
    </Suspense>
  );
}
