// app/languages/[id]/sentences/[categoryId]/SentenceCategoryClient.tsx
"use client";

import { useState, useTransition, useEffect } from "react";
import { ArrowLeft, Check, ListPlus, Pencil, Plus, Trash2, Volume2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createSentence, createSentences, updateSentence, deleteSentence } from "@/lib/actions/sentences";
import type { Category, Language, Sentence } from "@/lib/db/schema";

const STAGE_LABELS = ["新", "Lv.1", "Lv.2", "Lv.3", "Lv.4", "Lv.5", "已畢業"];

function getStageStyle(stage: number): string {
  if (stage === 0) return "bg-sky-50 text-sky-600 border-sky-200";
  if (stage === 6) return "bg-emerald-50 text-emerald-600 border-emerald-200";
  return "bg-indigo-50 text-indigo-600 border-indigo-200";
}

function formatRelativeDate(date: Date | string | null): string {
  if (!date) return "";
  const target = new Date(date);
  const now = new Date();
  target.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((target.getTime() - now.getTime()) / 86400000);
  if (diffDays <= 0) return "待複習";
  if (diffDays === 1) return "明日複習";
  return `${diffDays} 天後複習`;
}

function formatDate(date: Date | string | null): string {
  if (!date) return "-";
  const d = new Date(date);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

function parseBatchSentenceLine(line: string): { front: string; back: string } | null {
  const parts = line.includes("\t") ? line.split("\t") : line.split("|");
  const [front, back] = parts.map((p) => p.trim());
  if (!front || !back) return null;
  return { front, back };
}

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

  const router = useRouter();
  const [batchOpen, setBatchOpen] = useState(false);
  const [batchText, setBatchText] = useState("");
  const [batchErrors, setBatchErrors] = useState<number[]>([]);
  const [isBatchSubmitting, setIsBatchSubmitting] = useState(false);
  const [batchSubmitError, setBatchSubmitError] = useState("");

  const [sentences, setSentences] = useState(initialSentences);
  useEffect(() => { setSentences(initialSentences); }, [initialSentences]);
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

  async function handleBatchCreate() {
    const allLines = batchText.split("\n");
    const errorLines: number[] = [];
    const items: { front: string; back: string }[] = [];

    allLines.forEach((line, i) => {
      if (!line.trim()) return; // 空行略過，不計入 errorLines
      const parsed = parseBatchSentenceLine(line);
      if (!parsed) errorLines.push(i + 1); // i+1 = 原始文字的行號
      else items.push(parsed);
    });

    if (errorLines.length > 0) {
      setBatchErrors(errorLines);
      return;
    }
    if (items.length === 0) return;

    setIsBatchSubmitting(true);
    setBatchSubmitError("");
    try {
      await createSentences(items, language.id, defaultCategoryId);
      setBatchOpen(false);
      setBatchText("");
      setBatchErrors([]);
      router.refresh();
    } catch {
      setBatchSubmitError("新增失敗，請稍後再試");
    } finally {
      setIsBatchSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* 標題列 */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="self-start -ml-2 text-muted-foreground"
            asChild
          >
            <Link href={`/languages/${language.id}/sentences`}>
              <ArrowLeft className="w-4 h-4 mr-1" />
              句子管理
            </Link>
          </Button>
          <h1 className="text-2xl font-bold text-foreground">{categoryName}</h1>
          <p className="text-sm text-emerald-600/70 dark:text-emerald-400/70">
            {sentences.length} 個句子
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            className="bg-emerald-500 hover:bg-emerald-600 text-white"
            onClick={() => {
              setBatchOpen(true);
              setBatchText("");
              setBatchErrors([]);
            }}
          >
            <ListPlus className="w-4 h-4 mr-1" />
            批次新增
          </Button>
          <Button className="bg-emerald-500 hover:bg-emerald-600 text-white" onClick={() => setShowAddForm((s) => !s)}>
            <Plus className="w-4 h-4 mr-1" />新增句子
          </Button>
        </div>
      </div>

      {showAddForm && (
        <form
          onSubmit={handleAddSubmit}
          className="bg-card border border-emerald-500/20 rounded-2xl p-5 flex flex-col gap-3"
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
            <Button type="submit" className="bg-emerald-500 hover:bg-emerald-600 text-white">
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
                className="bg-card border border-emerald-500/40 rounded-2xl p-4 flex flex-col gap-2"
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
                    className="bg-emerald-500 hover:bg-emerald-600 text-white"
                    onClick={() => handleEditSubmit(sentence.id)}
                  >
                    <Check className="w-4 h-4 mr-1" />儲存
                  </Button>
                </div>
              </div>
            );
          }

          return (
            <Card key={sentence.id} className="border-emerald-500/20">
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-lg font-bold text-foreground">
                      {sentence.front}
                    </span>
                    {language.ttsCode && (
                      <button
                        onClick={() => {
                          const u = new SpeechSynthesisUtterance(sentence.front);
                          u.lang = language.ttsCode;
                          speechSynthesis.speak(u);
                        }}
                        className="text-muted-foreground hover:text-foreground transition-colors leading-none cursor-pointer"
                        aria-label="播放發音"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    )}
                    <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                      {sentence.back}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <Badge variant="outline" className={`text-xs ${getStageStyle(sentence.reviewStage)}`}>
                      {STAGE_LABELS[sentence.reviewStage]}
                    </Badge>
                    {sentence.reviewStage < 6 && (
                      <span className={`text-xs font-medium ${formatRelativeDate(sentence.nextReviewAt) === "待複習" ? "text-amber-600" : "text-muted-foreground"}`}>
                        {formatRelativeDate(sentence.nextReviewAt)}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      新增 {formatDate(sentence.createdAt)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => startEdit(sentence)}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
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
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 批次新增 */}
      <Dialog
        open={batchOpen}
        onOpenChange={(o) => {
          setBatchOpen(o);
          if (!o) {
            setBatchText("");
            setBatchErrors([]);
            setBatchSubmitError("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>批次新增句子 — {categoryName}</DialogTitle>
            <DialogDescription>
              每行一筆：翻譯（母語） | 句子（{language.name}）
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Textarea
              autoFocus
              rows={8}
              placeholder={"我愛貓 | I love cats\n她跑得很快 | She runs fast"}
              value={batchText}
              onChange={(e) => {
                setBatchText(e.target.value);
                if (batchErrors.length > 0) setBatchErrors([]);
              }}
            />
            {batchErrors.length > 0 && (
              <p className="text-sm text-destructive">
                以下行格式有誤（需至少「句子 | 翻譯」）：
                {batchErrors.map((n) => (
                  <span key={n} className="block font-medium">
                    ・第 {n} 行
                  </span>
                ))}
              </p>
            )}
            {batchSubmitError && (
              <p className="text-sm text-destructive">{batchSubmitError}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBatchOpen(false)}>
              取消
            </Button>
            <Button className="bg-emerald-500 hover:bg-emerald-600 text-white" onClick={handleBatchCreate} disabled={isBatchSubmitting || !batchText.trim()}>
              {isBatchSubmitting ? (
                "新增中…"
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-1" />
                  新增
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
