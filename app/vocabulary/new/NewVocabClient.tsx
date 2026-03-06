// app/vocabulary/new/NewVocabClient.tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import VocabForm from "@/components/VocabForm";
import { createCategory } from "@/lib/actions/categories";
import { createLanguage } from "@/lib/actions/languages";
import { createVocabulary } from "@/lib/actions/vocabulary";
import type { Category, Language } from "@/lib/db/schema";
import type { VocabFormData } from "@/lib/types";

export default function NewVocabClient({
  categories: initialCategories,
  languages: initialLanguages,
  defaultLanguageId,
  defaultCategoryId,
}: {
  categories: Category[];
  languages: Language[];
  defaultLanguageId: string | null;
  defaultCategoryId: string | null;
}) {
  const router = useRouter();
  const [vocabError, setVocabError] = useState("");
  const [categories, setCategories] = useState(initialCategories);
  const [languages, setLanguages] = useState(initialLanguages);

  async function handleSubmit(data: VocabFormData) {
    setVocabError("");
    try {
      await createVocabulary({
        front: data.front,
        back: data.back,
        exampleJp: data.exampleJp,
        categoryId: data.categoryId,
        languageId: data.languageId,
      });
      const target = data.languageId ? `/languages/${data.languageId}` : "/";
      router.push(target);
    } catch {
      setVocabError("新增失敗，請再試一次");
    }
  }

  async function handleCreateCategory(name: string) {
    if (!defaultLanguageId) throw new Error("缺少語言");
    const created = await createCategory(name, defaultLanguageId);
    setCategories((prev) => [...prev, created]);
    return created;
  }

  async function handleCreateLanguage(name: string, ttsCode: string) {
    const created = await createLanguage({ name, ttsCode });
    setLanguages((prev) => [...prev, created]);
    return created;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">新增單字</h1>
        <p className="text-stone-500 text-sm mt-1">加入新的單字到你的單字庫</p>
      </div>
      <div className="bg-card rounded-2xl border border-border p-6">
        {vocabError && (
          <p className="text-destructive text-sm mb-4">{vocabError}</p>
        )}
        <VocabForm
          categories={categories}
          languages={languages}
          initialData={{
            front: "",
            back: "",
            exampleJp: "",
            categoryId: defaultCategoryId,
            languageId: defaultLanguageId,
          }}
          onSubmit={handleSubmit}
          onCreateCategory={defaultLanguageId ? handleCreateCategory : undefined}
          onCreateLanguage={defaultLanguageId ? undefined : handleCreateLanguage}
          submitLabel="新增單字"
          showCategorySelector={!!defaultLanguageId}
          showLanguageSelector={!defaultLanguageId}
        />
      </div>
    </div>
  );
}
