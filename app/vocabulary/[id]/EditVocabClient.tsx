// app/vocabulary/[id]/EditVocabClient.tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import VocabForm from "@/components/VocabForm";
import { createCategory } from "@/lib/actions/categories";
import { updateVocabulary, deleteVocabulary } from "@/lib/actions/vocabulary";
import type { Category, Vocabulary } from "@/lib/db/schema";
import type { VocabFormData } from "@/lib/types";

export default function EditVocabClient({
  vocab,
  categories: initialCategories,
}: {
  vocab: Vocabulary;
  categories: Category[];
}) {
  const router = useRouter();
  const [vocabError, setVocabError] = useState("");
  const [categories, setCategories] = useState(initialCategories);

  async function handleSubmit(data: VocabFormData) {
    setVocabError("");
    try {
      await updateVocabulary(vocab.id, {
        japanese: data.japanese,
        chinese: data.chinese,
        exampleJp: data.exampleJp,
        categoryId: data.categoryId,
      });
      router.push("/vocabulary");
    } catch {
      setVocabError("儲存失敗，請再試一次");
    }
  }

  async function handleDelete() {
    await deleteVocabulary(vocab.id);
    router.push("/vocabulary");
  }

  async function handleCreateCategory(name: string) {
    const created = await createCategory(name);
    setCategories((prev) => [...prev, created]);
    return created;
  }

  const initialData: VocabFormData & { id: string } = {
    id: vocab.id,
    japanese: vocab.japanese,
    chinese: vocab.chinese,
    exampleJp: vocab.exampleJp,
    categoryId: vocab.categoryId,
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">編輯單字</h1>
          <p className="text-muted-foreground text-sm mt-1">
            修改 {vocab.japanese} 的資料
          </p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm">
              刪除單字
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>確認刪除</AlertDialogTitle>
              <AlertDialogDescription>
                確定刪除「{vocab.japanese}」？此操作無法復原。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-white hover:bg-destructive/90"
              >
                刪除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      <div className="bg-card rounded-2xl border border-border p-6">
        {vocabError && (
          <p className="text-destructive text-sm mb-4">{vocabError}</p>
        )}
        <VocabForm
          categories={categories}
          initialData={initialData}
          onSubmit={handleSubmit}
          onCreateCategory={handleCreateCategory}
          submitLabel="儲存變更"
          showCategorySelector
        />
      </div>
    </div>
  );
}
