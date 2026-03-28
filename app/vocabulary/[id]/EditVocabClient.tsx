// app/vocabulary/[id]/EditVocabClient.tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { ThreeDots } from "react-loader-spinner";
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
import { createLanguage } from "@/lib/actions/languages";
import { updateVocabulary, deleteVocabulary } from "@/lib/actions/vocabulary";
import type { Category, Language, Vocabulary } from "@/lib/db/schema";
import type { VocabFormData } from "@/lib/types";

export default function EditVocabClient({
  vocab,
  categories: initialCategories,
  languages: initialLanguages,
}: {
  vocab: Vocabulary;
  categories: Category[];
  languages: Language[];
}) {
  const router = useRouter();
  const [vocabError, setVocabError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [categories, setCategories] = useState(initialCategories);
  const [languages, setLanguages] = useState(initialLanguages);

  async function handleSubmit(data: VocabFormData) {
    setVocabError("");
    try {
      await updateVocabulary(vocab.id, {
        front: data.front,
        back: data.back,
        exampleJp: data.exampleJp,
        zhuyin: data.zhuyin,
        categoryId: data.categoryId,
        languageId: data.languageId,
      });
      router.push(vocab.languageId ? `/languages/${vocab.languageId}` : "/");
    } catch {
      setVocabError("儲存失敗，請再試一次");
    }
  }

  async function handleDelete() {
    setIsDeleting(true);
    await deleteVocabulary(vocab.id, vocab.languageId ?? undefined);
    router.push(vocab.languageId ? `/languages/${vocab.languageId}` : "/");
  }

  async function handleCreateCategory(name: string) {
    if (!vocab.languageId) throw new Error("缺少語言");
    const created = await createCategory(name, vocab.languageId);
    setCategories((prev) => [...prev, created]);
    return created;
  }

  async function handleCreateLanguage(name: string, ttsCode: string) {
    const created = await createLanguage({ name, ttsCode });
    setLanguages((prev) => [...prev, created]);
    return created;
  }

  const initialData: VocabFormData & { id: string } = {
    id: vocab.id,
    front: vocab.front,
    back: vocab.back,
    exampleJp: vocab.exampleJp,
    zhuyin: vocab.zhuyin,
    categoryId: vocab.categoryId,
    languageId: vocab.languageId,
  };

  const backHref = vocab.languageId ? `/languages/${vocab.languageId}` : "/";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="self-start -ml-2 text-muted-foreground"
            onClick={() => router.push(backHref)}
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            返回
          </Button>
          <h1 className="text-2xl font-bold text-foreground">編輯單字</h1>
          <p className="text-muted-foreground text-sm">
            修改 {vocab.back} 的資料
          </p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" disabled={isDeleting}>
              {isDeleting ? (
                <ThreeDots height="16" width="32" color="currentColor" />
              ) : (
                "刪除單字"
              )}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>確認刪除</AlertDialogTitle>
              <AlertDialogDescription>
                確定刪除「{vocab.back}」？此操作無法復原。
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
          languages={languages}
          initialData={initialData}
          onSubmit={handleSubmit}
          onCreateCategory={vocab.languageId ? handleCreateCategory : undefined}
          onCreateLanguage={!vocab.languageId ? handleCreateLanguage : undefined}
          submitLabel="儲存變更"
          showCategorySelector={!!vocab.languageId}
          showLanguageSelector={!vocab.languageId}
        />
      </div>
    </div>
  );
}
