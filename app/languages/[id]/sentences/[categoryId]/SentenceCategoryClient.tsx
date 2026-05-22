// app/languages/[id]/sentences/[categoryId]/SentenceCategoryClient.tsx
"use client";

import { useState, useTransition } from "react";
import { ArrowLeft, Check, Pencil, Plus, Trash2, X } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createSentence, updateSentence, deleteSentence } from "@/lib/actions/sentences";
import type { Category, Language, Sentence } from "@/lib/db/schema";

interface Props {
  language: Language;
  categoryId: string;
  categoryName: string;
  categories: Category[];
  initialSentences: Sentence[];
}

interface EditState {
  front: string;
  back: string;
  categoryId: string;
}

export default function SentenceCategoryClient({
  language,
  categoryId,
  categoryName,
  categories,
  initialSentences,
}: Props) {
  const [, startTransition] = useTransition();

  const [sentences, setSentences] = useState(initialSentences);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newFront, setNewFront] = useState("");
  const [newBack, setNewBack] = useState("");
  const [addError, setAddError] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>({
    front: "",
    back: "",
    categoryId: "none",
  });

  const categoryMap = Object.fromEntries(categories.map((c) => [c.id, c.name]));
  const defaultCategoryId = categoryId === "uncategorized" ? null : categoryId;

  function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    const front = newFront.trim();
    const back = newBack.trim();
    if (!front || !back) {
      setAddError("句子和翻譯都是必填");
      return;
    }
    startTransition(async () => {
      const created = await createSentence({
        front,
        back,
        languageId: language.id,
        categoryId: defaultCategoryId,
      });
      setSentences((prev) => [...prev, created]);
      setNewFront("");
      setNewBack("");
      setAddError("");
      setShowAddForm(false);
    });
  }

  function startEdit(sentence: Sentence) {
    setEditingId(sentence.id);
    setEditState({
      front: sentence.front,
      back: sentence.back,
      categoryId: sentence.categoryId ?? "none",
    });
  }

  function handleEditSubmit(id: string) {
    const front = editState.front.trim();
    const back = editState.back.trim();
    if (!front || !back) return;
    const newCatId =
      editState.categoryId === "none" ? null : editState.categoryId;
    startTransition(async () => {
      await updateSentence(id, { front, back, categoryId: newCatId });
      setSentences((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, front, back, categoryId: newCatId } : s
        )
      );
      setEditingId(null);
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteSentence(id, language.id);
      setSentences((prev) => prev.filter((s) => s.id !== id));
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 text-muted-foreground"
          asChild
        >
          <Link href={`/languages/${language.id}/sentences`}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            句子管理
          </Link>
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{categoryName}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {language.name} · {sentences.length} 個句子
          </p>
        </div>
        <Button onClick={() => setShowAddForm((s) => !s)}>
          <Plus className="w-4 h-4 mr-1" />新增句子
        </Button>
      </div>

      {showAddForm && (
        <form
          onSubmit={handleAddSubmit}
          className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-3"
        >
          <h2 className="font-semibold text-foreground">新增句子</h2>
          <div className="flex flex-col gap-2">
            <Input
              autoFocus
              placeholder={`句子（${language.name}）`}
              value={newFront}
              onChange={(e) => {
                setNewFront(e.target.value);
                setAddError("");
              }}
            />
            <Input
              placeholder="翻譯（母語）"
              value={newBack}
              onChange={(e) => {
                setNewBack(e.target.value);
                setAddError("");
              }}
            />
          </div>
          {addError && <p className="text-destructive text-sm">{addError}</p>}
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowAddForm(false);
                setAddError("");
              }}
            >
              取消
            </Button>
            <Button type="submit">
              <Plus className="w-4 h-4 mr-1" />新增
            </Button>
          </div>
        </form>
      )}

      {sentences.length === 0 && !showAddForm && (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center text-muted-foreground">
          <p className="text-lg font-medium">還沒有句子</p>
          <p className="text-sm">點擊「新增句子」開始加入</p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {sentences.map((sentence) => {
          const isEditing = editingId === sentence.id;

          if (isEditing) {
            return (
              <div
                key={sentence.id}
                className="bg-card border border-primary/40 rounded-2xl p-4 flex flex-col gap-2"
              >
                <Input
                  autoFocus
                  value={editState.front}
                  onChange={(e) =>
                    setEditState((s) => ({ ...s, front: e.target.value }))
                  }
                  placeholder="句子"
                />
                <Input
                  value={editState.back}
                  onChange={(e) =>
                    setEditState((s) => ({ ...s, back: e.target.value }))
                  }
                  placeholder="翻譯"
                />
                {categories.length > 0 && (
                  <Select
                    value={editState.categoryId}
                    onValueChange={(v) =>
                      setEditState((s) => ({ ...s, categoryId: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="選擇分類" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">無分類</SelectItem>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <div className="flex gap-2 justify-end mt-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingId(null)}
                  >
                    <X className="w-4 h-4 mr-1" />取消
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleEditSubmit(sentence.id)}
                  >
                    <Check className="w-4 h-4 mr-1" />儲存
                  </Button>
                </div>
              </div>
            );
          }

          return (
            <div
              key={sentence.id}
              className="bg-card border border-border rounded-2xl px-5 py-4 flex items-start gap-3"
            >
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground text-base leading-snug">
                  {sentence.front}
                </p>
                <p className="text-muted-foreground text-sm mt-1 leading-snug">
                  {sentence.back}
                </p>
                {sentence.categoryId && categoryMap[sentence.categoryId] && (
                  <Badge variant="secondary" className="mt-2 text-xs">
                    {categoryMap[sentence.categoryId]}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => startEdit(sentence)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>刪除句子？</AlertDialogTitle>
                      <AlertDialogDescription>
                        「{sentence.front}」將被永久刪除，無法復原。
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>取消</AlertDialogCancel>
                      <AlertDialogAction
                        variant="destructive"
                        onClick={() => handleDelete(sentence.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />刪除
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
