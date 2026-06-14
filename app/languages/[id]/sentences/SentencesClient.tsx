// app/languages/[id]/sentences/SentencesClient.tsx
"use client";

import { ArrowLeft, BarChart2, FolderPlus, Plus } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createCategory } from "@/lib/actions/categories";
import type { Category, Language } from "@/lib/db/schema";

const UNCATEGORIZED_ID = "uncategorized";

function SentenceCategoryCard({
  cat,
  languageId,
  sentenceCount,
  isVirtual = false,
}: {
  cat: Category;
  languageId: string;
  sentenceCount: number;
  isVirtual?: boolean;
}) {
  const href = isVirtual
    ? `/languages/${languageId}/sentences/uncategorized`
    : `/languages/${languageId}/sentences/${cat.id}`;

  return (
    <Link
      href={href}
      className="bg-card rounded-2xl border border-emerald-500/20 overflow-hidden flex items-center gap-2 px-5 py-3.5 hover:bg-emerald-500/5 hover:border-emerald-500/40 transition-all active:scale-[0.99] cursor-pointer"
    >
      <span className="font-semibold text-foreground truncate min-w-0">
        {cat.name}
      </span>
      <span className="text-sm text-emerald-600/70 dark:text-emerald-400/70 shrink-0 ml-auto">
        {sentenceCount} 個句子
      </span>
    </Link>
  );
}

interface Props {
  language: Language;
  totalCount: number;
  reviewCount: number;
  tomorrowCount: number;
  initialCategories: Category[];
  categoryCounts: Record<string, number>;
}

export default function SentencesClient({
  language,
  totalCount,
  reviewCount,
  tomorrowCount,
  initialCategories,
  categoryCounts,
}: Props) {
  const [, startTransition] = useTransition();
  const [showCatInput, setShowCatInput] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [catError, setCatError] = useState("");

  function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newCatName.trim();
    if (!trimmed) return;
    const isDuplicate = initialCategories.some(
      (c) => c.name.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (isDuplicate) {
      setCatError(`「${trimmed}」分類已存在`);
      return;
    }
    startTransition(async () => {
      await createCategory(trimmed, language.id, "sentence");
    });
    setNewCatName("");
    setCatError("");
    setShowCatInput(false);
  }

  const virtualCategory: Category = {
    id: UNCATEGORIZED_ID,
    name: "未分類",
    userId: language.userId,
    languageId: language.id,
    type: "sentence",
    createdAt: language.createdAt,
  };

  const realUncategorized = initialCategories.find((c) => c.name === "未分類");
  const otherCategories = initialCategories.filter((c) => c.name !== "未分類");

  const groups = realUncategorized
    ? [
        {
          cat: realUncategorized,
          sentenceCount: categoryCounts[realUncategorized.id] ?? 0,
          isVirtual: false,
        },
        ...otherCategories.map((cat) => ({
          cat,
          sentenceCount: categoryCounts[cat.id] ?? 0,
          isVirtual: false,
        })),
      ]
    : [
        {
          cat: virtualCategory,
          sentenceCount: categoryCounts["uncategorized"] ?? 0,
          isVirtual: true,
        },
        ...initialCategories.map((cat) => ({
          cat,
          sentenceCount: categoryCounts[cat.id] ?? 0,
          isVirtual: false,
        })),
      ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 text-muted-foreground"
          asChild
        >
          <Link href={`/languages/${language.id}`}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            {language.name}
          </Link>
        </Button>
        <Button variant="ghost" size="sm" className="border border-emerald-500/50 text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400" asChild>
          <Link href={`/languages/${language.id}/sentences/stats`}>
            <BarChart2 className="w-4 h-4 mr-1" />統計
          </Link>
        </Button>
      </div>

      <h1 className="text-2xl font-bold text-foreground">句子管理</h1>

      {/* 統計格 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card border border-emerald-500/20 rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-emerald-500">{reviewCount}</p>
          <p className="text-xs text-emerald-600/60 dark:text-emerald-400/60 mt-1">待複習</p>
        </div>
        <div className="bg-card border border-emerald-500/20 rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{totalCount}</p>
          <p className="text-xs text-emerald-600/60 dark:text-emerald-400/60 mt-1">總句子</p>
        </div>
      </div>

      {/* 複習按鈕 */}
      {reviewCount > 0 ? (
        <Button
          size="lg"
          className="w-full text-lg py-7 active:scale-[0.98] transition-transform bg-emerald-500 hover:bg-emerald-600 text-white"
          asChild
        >
          <Link href={`/sentences/${language.id}/review`}>
            開始複習（{reviewCount} 個）
          </Link>
        </Button>
      ) : (
        <Button size="lg" className="w-full text-lg py-7 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20" disabled>
          今日無待複習句子
        </Button>
      )}

      {tomorrowCount > 0 && (
        <Link
          href={`/languages/${language.id}/sentences/tomorrow`}
          className="text-sm text-emerald-600/70 dark:text-emerald-400/70 hover:text-emerald-500 text-center block -mt-3"
        >
          明天待複習 {tomorrowCount} 個 →
        </Link>
      )}

      {/* 句子庫 */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">句子庫</h2>
          <div className="flex gap-2">
            <Button className="bg-emerald-500 hover:bg-emerald-600 text-white" onClick={() => setShowCatInput((s) => !s)}>
              <FolderPlus className="w-4 h-4" />
              <span className="hidden sm:inline ml-1">新增分類</span>
            </Button>
            <Button className="bg-emerald-500 hover:bg-emerald-600 text-white" asChild>
              <Link href={`/languages/${language.id}/sentences/uncategorized`}>
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline ml-1">新增句子</span>
              </Link>
            </Button>
          </div>
        </div>

        {showCatInput && (
          <div className="flex flex-col gap-1.5">
            <form onSubmit={handleAddCategory} className="flex gap-2">
              <Input
                autoFocus
                className="flex-1"
                placeholder="分類名稱..."
                value={newCatName}
                onChange={(e) => {
                  setNewCatName(e.target.value);
                  if (catError) setCatError("");
                }}
                onKeyDown={(e) => e.key === "Escape" && setShowCatInput(false)}
              />
              <Button type="submit" className="shrink-0 bg-emerald-500 hover:bg-emerald-600 text-white">
                <Plus className="w-4 h-4 mr-1" />建立
              </Button>
              <Button
                type="button"
                variant="outline"
                className="shrink-0"
                onClick={() => {
                  setShowCatInput(false);
                  setNewCatName("");
                  setCatError("");
                }}
              >
                取消
              </Button>
            </form>
            {catError && <p className="text-destructive text-sm">{catError}</p>}
          </div>
        )}

        {groups.map(({ cat, sentenceCount, isVirtual }) => (
          <SentenceCategoryCard
            key={cat.id}
            cat={cat}
            languageId={language.id}
            sentenceCount={sentenceCount}
            isVirtual={isVirtual}
          />
        ))}
      </div>
    </div>
  );
}
