// app/languages/[id]/categories/[categoryId]/CategoryClient.tsx
"use client";

import { ArrowLeft, BookOpen, ListPlus, Pencil, Plus, Save, Trash2 } from "lucide-react";
import Link from "next/link";
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
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import VocabCard from "@/components/VocabCard";
import { deleteCategory, updateCategory } from "@/lib/actions/categories";
import { createVocabularies, deleteVocabulary } from "@/lib/actions/vocabulary";
import type { Category, Language, Vocabulary } from "@/lib/db/schema";

function parseBatchVocabLine(
	line: string,
	isChineseLanguage: boolean,
): { back: string; front: string; exampleJp: string; zhuyin: string } | null {
	const parts = line.includes("\t") ? line.split("\t") : line.split("|");
	const [front, back, third] = parts.map((p) => p.trim());
	if (!front || !back) return null;
	return {
		front,
		back,
		exampleJp: isChineseLanguage ? "" : (third ?? ""),
		zhuyin: isChineseLanguage ? (third ?? "") : "",
	};
}

interface Props {
	language: Language;
	category: Category;
	initialVocabularies: Vocabulary[];
	isVirtual: boolean;
}

export default function CategoryClient({
	language,
	category,
	initialVocabularies,
	isVirtual,
}: Props) {
	const router = useRouter();
	const [batchOpen, setBatchOpen] = useState(false);
	const [batchText, setBatchText] = useState("");
	const [batchErrors, setBatchErrors] = useState<number[]>([]);
	const [isBatchSubmitting, setIsBatchSubmitting] = useState(false);
	const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
	const [renameOpen, setRenameOpen] = useState(false);
	const [renameName, setRenameName] = useState("");
	const [isRenameSubmitting, setIsRenameSubmitting] = useState(false);
	const [deleteOpen, setDeleteOpen] = useState(false);
	const [isDeleteSubmitting, setIsDeleteSubmitting] = useState(false);

	const isChineseLanguage = language.ttsCode === "zh-TW";
	const pendingDeleteVocab = initialVocabularies.find(
		(v) => v.id === pendingDeleteId,
	);

	async function handleBatchCreate() {
		const lines = batchText.split("\n").filter((l) => l.trim());
		const errorLines: number[] = [];
		const items: {
			back: string;
			front: string;
			exampleJp: string;
			zhuyin: string;
		}[] = [];

		lines.forEach((line, i) => {
			const parsed = parseBatchVocabLine(line, isChineseLanguage);
			if (!parsed) errorLines.push(i + 1);
			else items.push(parsed);
		});

		if (errorLines.length > 0) {
			setBatchErrors(errorLines);
			return;
		}
		if (items.length === 0) return;

		setIsBatchSubmitting(true);
		await createVocabularies(
			items,
			language.id,
			isVirtual ? null : category.id,
		);
		setIsBatchSubmitting(false);
		setBatchOpen(false);
		setBatchText("");
		setBatchErrors([]);
		router.refresh();
	}

	async function confirmDelete() {
		if (!pendingDeleteId) return;
		await deleteVocabulary(pendingDeleteId, language.id);
		setPendingDeleteId(null);
		router.refresh();
	}

	async function handleRename() {
		const trimmed = renameName.trim();
		if (!trimmed) return;
		setIsRenameSubmitting(true);
		await updateCategory(category.id, trimmed, language.id);
		setIsRenameSubmitting(false);
		setRenameOpen(false);
		router.refresh();
	}

	async function handleDeleteCategory() {
		setIsDeleteSubmitting(true);
		await deleteCategory(category.id, language.id);
		setIsDeleteSubmitting(false);
		router.push(`/languages/${language.id}`);
	}

	const newVocabHref = isVirtual
		? `/vocabulary/new?languageId=${language.id}`
		: `/vocabulary/new?languageId=${language.id}&categoryId=${category.id}`;

	return (
		<div className="flex flex-col gap-6">
			{/* 標題列 */}
			<div className="flex items-center justify-between gap-4">
				<div className="flex flex-col gap-1">
					<Button
						variant="ghost"
						size="sm"
						className="self-start -ml-2 text-muted-foreground"
						onClick={() => router.push(`/languages/${language.id}`)}
					>
						<ArrowLeft className="w-4 h-4 mr-1" />
						{language.name}
					</Button>
					<div className="flex items-center gap-1">
						<h1 className="text-2xl font-bold text-foreground">
							{category.name}
						</h1>
						{!isVirtual && (
							<>
								<Button
									variant="ghost"
									size="icon"
									className="text-muted-foreground hover:text-foreground"
									onClick={() => {
										setRenameName(category.name);
										setRenameOpen(true);
									}}
								>
									<Pencil className="w-4 h-4" />
								</Button>
								<Button
									variant="ghost"
									size="icon"
									className="text-destructive hover:text-destructive"
									onClick={() => setDeleteOpen(true)}
								>
									<Trash2 className="w-4 h-4" />
								</Button>
							</>
						)}
					</div>
					<p className="text-sm text-muted-foreground">
						{initialVocabularies.length} 個單字
					</p>
				</div>
				<div className="flex gap-2 shrink-0">
					<Button
						onClick={() => {
							setBatchOpen(true);
							setBatchText("");
							setBatchErrors([]);
						}}
					>
						<ListPlus className="w-4 h-4 mr-1" />
						批次新增
					</Button>
					<Button asChild>
						<Link href={newVocabHref}>
							<Plus className="w-4 h-4 mr-1" />
							新增單字
						</Link>
					</Button>
				</div>
			</div>

			{/* 單字列表 */}
			<div className="flex flex-col gap-2">
				{initialVocabularies.length === 0 ? (
					<div className="flex flex-col items-center gap-4 py-14 text-center">
						<BookOpen className="w-12 h-12 text-muted-foreground/30" />
						<div>
							<p className="font-medium text-foreground">還沒有單字</p>
							<p className="text-sm text-muted-foreground mt-1">新增第一個單字，開始學習之旅</p>
						</div>
						<div className="flex gap-2">
							<Button
								variant="outline"
								onClick={() => {
									setBatchOpen(true);
									setBatchText("");
									setBatchErrors([]);
								}}
							>
								<ListPlus className="w-4 h-4 mr-1" />批次新增
							</Button>
							<Button asChild>
								<Link href={newVocabHref}>
									<Plus className="w-4 h-4 mr-1" />新增單字
								</Link>
							</Button>
						</div>
					</div>
				) : (
					initialVocabularies.map((vocab) => (
						<VocabCard
							key={vocab.id}
							vocab={vocab}
							ttsCode={language.ttsCode}
							onDelete={() => setPendingDeleteId(vocab.id)}
						/>
					))
				)}
			</div>

			{/* 刪除確認 */}
			<AlertDialog
				open={!!pendingDeleteId}
				onOpenChange={(open) => !open && setPendingDeleteId(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>確認刪除</AlertDialogTitle>
						<AlertDialogDescription>
							確定刪除「{pendingDeleteVocab?.front}」？此操作無法復原。
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>取消</AlertDialogCancel>
						<AlertDialogAction onClick={confirmDelete} variant="destructive">
							<Trash2 className="w-4 h-4 mr-1" />
							刪除
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* 重新命名 */}
			<Dialog
				open={renameOpen}
				onOpenChange={(o) => !isRenameSubmitting && setRenameOpen(o)}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>重新命名分類</DialogTitle>
						<DialogDescription>輸入新的分類名稱</DialogDescription>
					</DialogHeader>
					<Input
						autoFocus
						value={renameName}
						onChange={(e) => setRenameName(e.target.value)}
						onKeyDown={(e) => e.key === "Enter" && handleRename()}
						placeholder="分類名稱..."
					/>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setRenameOpen(false)}
							disabled={isRenameSubmitting}
						>
							取消
						</Button>
						<Button
							onClick={handleRename}
							disabled={isRenameSubmitting || !renameName.trim()}
						>
							{isRenameSubmitting ? (
								"儲存中…"
							) : (
								<>
									<Save className="w-4 h-4 mr-1" />
									儲存
								</>
							)}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* 刪除分類確認 */}
			<AlertDialog
				open={deleteOpen}
				onOpenChange={(o) => !isDeleteSubmitting && setDeleteOpen(o)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>確認刪除分類</AlertDialogTitle>
						<AlertDialogDescription>
							確定刪除「{category.name}
							」分類？分類內的單字將移至未分類。此操作無法復原。
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isDeleteSubmitting}>
							取消
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDeleteCategory}
							disabled={isDeleteSubmitting}
							variant="destructive"
						>
							{isDeleteSubmitting ? (
								"刪除中…"
							) : (
								<>
									<Trash2 className="w-4 h-4 mr-1" />
									刪除
								</>
							)}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* 批次新增 */}
			<Dialog
				open={batchOpen}
				onOpenChange={(o) => {
					setBatchOpen(o);
					if (!o) {
						setBatchText("");
						setBatchErrors([]);
					}
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>批次新增單字 — {category.name}</DialogTitle>
						<DialogDescription>
							{isChineseLanguage
								? "每行一筆：母語 | 目標語言 | 注音（選填）"
								: "每行一筆：翻譯 | 目標語單字 | 例句（選填）"}
						</DialogDescription>
					</DialogHeader>
					<div className="flex flex-col gap-2">
						<Textarea
							autoFocus
							rows={8}
							placeholder={"吃 | 食べる | 私はご飯を食べる\n喝 | 飲む"}
							value={batchText}
							onChange={(e) => {
								setBatchText(e.target.value);
								if (batchErrors.length > 0) setBatchErrors([]);
							}}
						/>
						{batchErrors.length > 0 && (
							<p className="text-sm text-destructive">
								{isChineseLanguage
									? "以下行格式有誤（需至少「母語 | 目標語言」）："
									: "以下行格式有誤（需至少「翻譯 | 目標語單字」）："}
								{batchErrors.map((n) => (
									<span key={n} className="block font-medium">
										・第 {n} 行
									</span>
								))}
							</p>
						)}
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setBatchOpen(false)}>
							取消
						</Button>
						<Button onClick={handleBatchCreate} disabled={isBatchSubmitting}>
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
