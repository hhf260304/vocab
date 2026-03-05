// app/languages/[id]/LanguageClient.tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
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
import { deleteLanguage, updateLanguage } from "@/lib/actions/languages";
import type { Language } from "@/lib/db/schema";

interface Props {
  language: Language;
  reviewCount: number;
  totalCount: number;
  graduatedCount: number;
}

export default function LanguageClient({
  language,
  reviewCount,
  totalCount,
  graduatedCount,
}: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  function handleToggleSide() {
    const newSide = language.defaultSide === "front" ? "back" : "front";
    startTransition(async () => {
      await updateLanguage(language.id, { defaultSide: newSide as "front" | "back" });
      router.refresh();
    });
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteLanguage(language.id);
      router.push("/");
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{language.name}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            預設顯示：{language.defaultSide === "front" ? "正面（提示）" : "反面（目標語言）"}
          </p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              刪除
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>刪除語言</AlertDialogTitle>
              <AlertDialogDescription>
                確定刪除「{language.name}」？此語言的單字將不會被刪除，但會失去語言關聯。
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
        <div className="bg-card border border-border rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{graduatedCount}</p>
          <p className="text-xs text-muted-foreground mt-1">已畢業</p>
        </div>
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

      {/* 快捷操作 */}
      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" asChild>
          <Link href={`/vocabulary/new?languageId=${language.id}`}>
            + 新增單字
          </Link>
        </Button>
        <Button variant="outline" className="flex-1" asChild>
          <Link href={`/vocabulary?languageId=${language.id}`}>
            查看單字庫
          </Link>
        </Button>
      </div>

      {/* 設定 */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <h3 className="font-semibold text-foreground mb-3">複習設定</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">預設顯示面</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {language.defaultSide === "front"
                ? "先看提示，翻轉後看目標語言"
                : "先看目標語言，翻轉後看提示"}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleToggleSide}>
            {language.defaultSide === "front" ? "切換為反面" : "切換為正面"}
          </Button>
        </div>
      </div>
    </div>
  );
}
