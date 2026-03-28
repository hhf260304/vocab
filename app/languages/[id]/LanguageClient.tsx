// app/languages/[id]/LanguageClient.tsx
"use client";

import { FolderPlus, Plus } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GraduatedSheet } from "@/components/GraduatedSheet";
import { createCategory } from "@/lib/actions/categories";
import type { Category, Language } from "@/lib/db/schema";

const UNCATEGORIZED_ID = "uncategorized";

function CategorySection({
  cat,
  languageId,
  vocabCount,
  isVirtual = false,
}: {
  cat: Category;
  languageId: string;
  vocabCount: number;
  isVirtual?: boolean;
}) {
  const href = isVirtual
    ? `/languages/${languageId}/categories/uncategorized`
    : `/languages/${languageId}/categories/${cat.id}`;

  return (
    <Link
      href={href}
      className="bg-card rounded-2xl border border-border overflow-hidden flex items-center gap-2 px-5 py-3.5 hover:bg-muted/50 transition-colors"
    >
      <span className="font-semibold text-foreground truncate min-w-0">
        {cat.name}
      </span>
      <span className="text-sm text-muted-foreground shrink-0 ml-auto">
        {vocabCount} 個單字
      </span>

    </Link>
  );
}

interface Props {
  language: Language;
  reviewCount: number;
  totalCount: number;
  graduatedCount: number;
  initialCategories: Category[];
  vocabCounts: Record<string, number>;
}

export default function LanguageClient({
  language,
  reviewCount,
  totalCount,
  graduatedCount,
  initialCategories,
  vocabCounts,
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
      (c) => c.name.trim().toLowerCase() === trimmed.toLowerCase(),
    );
    if (isDuplicate) {
      setCatError(`「${trimmed}」分類已存在`);
      return;
    }
    startTransition(async () => {
      await createCategory(trimmed, language.id);
    });
    setNewCatName("");
    setCatError("");
    setShowCatInput(false);
  }

  const realUncategorized = initialCategories.find((c) => c.name === "未分類");
  const otherCategories = initialCategories.filter((c) => c.name !== "未分類");

  const virtualCategory: Category = {
    id: UNCATEGORIZED_ID,
    name: "未分類",
    userId: language.userId,
    languageId: language.id,
    createdAt: language.createdAt,
  };

  const groups = realUncategorized
    ? [
        { cat: realUncategorized, vocabCount: vocabCounts[realUncategorized.id] ?? 0, isVirtual: false },
        ...otherCategories.map((cat) => ({
          cat,
          vocabCount: vocabCounts[cat.id] ?? 0,
          isVirtual: false,
        })),
      ]
    : [
        { cat: virtualCategory, vocabCount: vocabCounts["uncategorized"] ?? 0, isVirtual: true },
        ...initialCategories.map((cat) => ({
          cat,
          vocabCount: vocabCounts[cat.id] ?? 0,
          isVirtual: false,
        })),
      ];

  return (
    <div className="flex flex-col gap-6">
      {/* 標題 */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {language.name}
        </h1>
      </div>

      {/* 統計 */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-primary">{reviewCount}</p>
          <p className="text-xs text-muted-foreground mt-1">待複習</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{totalCount}</p>
          <p className="text-xs text-muted-foreground mt-1">總單字</p>
        </div>
        <GraduatedSheet languageId={language.id} totalCount={graduatedCount}>
          <div className="bg-card border border-border rounded-2xl p-4 text-center cursor-pointer hover:bg-accent transition-colors">
            <p className="text-2xl font-bold text-foreground">{graduatedCount}</p>
            <p className="text-xs text-muted-foreground mt-1">已畢業</p>
          </div>
        </GraduatedSheet>
      </div>

      {/* 開始複習 */}
      {reviewCount > 0 ? (
        <Button size="lg" className="w-full text-lg py-7" asChild>
          <Link href={`/review/${language.id}`}>
            開始複習（{reviewCount} 個）
          </Link>
        </Button>
      ) : (
        <Button size="lg" className="w-full text-lg py-7" disabled>
          今日無待複習單字
        </Button>
      )}

      {/* 單字庫 */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">單字庫</h2>
          <div className="flex gap-2">
            <Button onClick={() => setShowCatInput((s) => !s)}>
              <FolderPlus className="w-4 h-4 mr-1" />新增分類
            </Button>
            <Button asChild>
              <Link href={realUncategorized ? `/vocabulary/new?languageId=${language.id}&categoryId=${realUncategorized.id}` : `/vocabulary/new?languageId=${language.id}`}>
                <Plus className="w-4 h-4 mr-1" />新增單字
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
              <Button type="submit" className="shrink-0">
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

        {groups.map(({ cat, vocabCount, isVirtual }) => (
          <CategorySection
            key={cat.id}
            cat={cat}
            languageId={language.id}
            vocabCount={vocabCount}
            isVirtual={isVirtual}
          />
        ))}
      </div>

    </div>
  );
}
