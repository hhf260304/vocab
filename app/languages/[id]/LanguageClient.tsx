// app/languages/[id]/LanguageClient.tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
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
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import VocabCard from "@/components/VocabCard";
import {
	createCategories,
	createCategory,
	deleteCategory,
	updateCategory,
} from "@/lib/actions/categories";
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

function CategorySection({
	cat,
	vocabs,
	languageId,
	ttsCode,
	isChineseLanguage,
	categories,
	onDelete,
	onDeleteCategory,
}: {
	cat: Category;
	vocabs: Vocabulary[];
	languageId: string;
	ttsCode: string;
	isChineseLanguage: boolean;
	categories: Category[];
	onDelete: (id: string) => void;
	onDeleteCategory: (id: string) => void;
}) {
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const [batchOpen, setBatchOpen] = useState(false);
	const [batchText, setBatchText] = useState("");
	const [batchErrors, setBatchErrors] = useState<number[]>([]);
	const [isBatchSubmitting, setIsBatchSubmitting] = useState(false);
	const [isEditing, setIsEditing] = useState(false);
	const [editName, setEditName] = useState(cat.name);

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
		await createVocabularies(items, languageId, cat.id);
		setIsBatchSubmitting(false);
		setBatchOpen(false);
		setBatchText("");
		setBatchErrors([]);
		router.refresh();
	}

	async function handleRename() {
		const trimmed = editName.trim();
		if (!trimmed || trimmed === cat.name) {
			setIsEditing(false);
			setEditName(cat.name);
			return;
		}
		const isDuplicate = categories.some(
			(c) =>
				c.id !== cat.id &&
				c.name.trim().toLowerCase() === trimmed.toLowerCase(),
		);
		if (isDuplicate) {
			setEditName(cat.name);
			setIsEditing(false);
			return;
		}
		await updateCategory(cat.id, trimmed, languageId);
		setIsEditing(false);
		router.refresh();
	}

	const contentId = `collapsible-content-${cat.id}`;
	const menuTriggerId = `category-menu-${cat.id}`;

	return (
		<Collapsible
			open={open}
			onOpenChange={setOpen}
			className="bg-card rounded-2xl border border-border overflow-hidden"
		>
			<div className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/50 transition-colors">
				{isEditing ? (
					<div
						className="flex items-center gap-2 flex-1 min-w-0"
						onClick={(e) => e.stopPropagation()}
					>
						<Input
							autoFocus
							className="h-7 text-sm font-semibold"
							value={editName}
							onChange={(e) => setEditName(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter") handleRename();
								if (e.key === "Escape") {
									setIsEditing(false);
									setEditName(cat.name);
								}
							}}
						/>
						<Button
							size="sm"
							variant="outline"
							onClick={handleRename}
							className="shrink-0"
						>
							✓
						</Button>
						<Button
							size="sm"
							variant="ghost"
							onClick={() => {
								setIsEditing(false);
								setEditName(cat.name);
							}}
							className="shrink-0"
						>
							✕
						</Button>
					</div>
				) : (
					<CollapsibleTrigger aria-controls={contentId} className="flex items-center gap-2 flex-1 min-w-0 text-left">
						<span className="font-semibold text-foreground truncate min-w-0">
							{cat.name}
						</span>
						<span className="text-sm text-muted-foreground shrink-0">
							{vocabs.length} 個單字
						</span>
						<span className="text-muted-foreground text-xs ml-auto">
							{open ? "▼" : "▶"}
						</span>
					</CollapsibleTrigger>
				)}
				{!isEditing && (
					<div className="ml-2 shrink-0">
						<DropdownMenu>
							<DropdownMenuTrigger
								asChild
								id={menuTriggerId}
								onClick={(e) => e.stopPropagation()}
							>
								<Button
									variant="ghost"
									size="sm"
									className="px-2 text-muted-foreground"
								>
									⋮
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								<DropdownMenuItem asChild>
									<Link href={`/review/${languageId}?categoryId=${cat.id}`}>
										複習此分類
									</Link>
								</DropdownMenuItem>
								<DropdownMenuItem asChild>
									<Link
										href={`/vocabulary/new?languageId=${languageId}&categoryId=${cat.id}`}
									>
										新增單字
									</Link>
								</DropdownMenuItem>
								<DropdownMenuItem
									onSelect={() => {
										setBatchOpen(true);
										setBatchText("");
										setBatchErrors([]);
									}}
								>
									批次新增單字
								</DropdownMenuItem>
								<DropdownMenuItem onSelect={() => setIsEditing(true)}>
									重新命名
								</DropdownMenuItem>
								<DropdownMenuItem
									onSelect={() => onDeleteCategory(cat.id)}
									className="text-destructive focus:text-destructive"
								>
									刪除分類
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				)}
			</div>
			<CollapsibleContent id={contentId}>
				<div className="flex flex-col gap-px border-t border-border">
					{vocabs.length === 0 ? (
						<p className="text-sm text-muted-foreground px-5 py-4">
							還沒有單字，點「+ 單字」開始新增
						</p>
					) : (
						vocabs.map((vocab) => (
							<div key={vocab.id} className="px-2 py-1">
								<VocabCard
									vocab={vocab}
									ttsCode={ttsCode}
									onDelete={() => onDelete(vocab.id)}
								/>
							</div>
						))
					)}
				</div>
			</CollapsibleContent>

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
						<DialogTitle>批次新增單字 — {cat.name}</DialogTitle>
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
							{isBatchSubmitting ? "新增中…" : "新增"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</Collapsible>
	);
}

interface Props {
	language: Language;
	reviewCount: number;
	totalCount: number;
	graduatedCount: number;
	initialCategories: Category[];
	initialVocabularies: Vocabulary[];
}

export default function LanguageClient({
	language,
	reviewCount,
	totalCount,
	graduatedCount,
	initialCategories,
	initialVocabularies,
}: Props) {
	const router = useRouter();
	const [, startTransition] = useTransition();
	const [showCatInput, setShowCatInput] = useState(false);
	const [newCatName, setNewCatName] = useState("");
	const [catError, setCatError] = useState("");
	const [pendingDelete, setPendingDelete] = useState<{
		type: "vocab" | "category";
		id: string;
		name: string;
	} | null>(null);
	const [batchOpen, setBatchOpen] = useState(false);
	const [batchText, setBatchText] = useState("");
	const [batchDuplicates, setBatchDuplicates] = useState<string[]>([]);
	const [isBatchSubmitting, setIsBatchSubmitting] = useState(false);

	function handleDeleteVocab(id: string) {
		const vocab = initialVocabularies.find((v) => v.id === id);
		if (vocab) setPendingDelete({ type: "vocab", id, name: vocab.front });
	}

	function handleDeleteCategory(id: string) {
		const cat = initialCategories.find((c) => c.id === id);
		if (cat) setPendingDelete({ type: "category", id, name: cat.name });
	}

	function confirmDelete() {
		if (!pendingDelete) return;
		const snapshot = pendingDelete;
		setPendingDelete(null);
		startTransition(async () => {
			if (snapshot.type === "vocab") {
				await deleteVocabulary(snapshot.id, language.id);
			} else {
				await deleteCategory(snapshot.id, language.id);
			}
		});
	}

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

	async function handleBatchCreate() {
		const names = batchText
			.split("\n")
			.map((n) => n.trim())
			.filter(Boolean);
		if (names.length === 0) return;

		setIsBatchSubmitting(true);
		const result = await createCategories(names, language.id);
		setIsBatchSubmitting(false);

		if ("duplicates" in result) {
			setBatchDuplicates(result.duplicates);
			return;
		}

		setBatchOpen(false);
		setBatchText("");
		setBatchDuplicates([]);
		router.refresh();
	}

	const groups = initialCategories.map((cat) => ({
		cat,
		vocabs: initialVocabularies.filter((v) => v.categoryId === cat.id),
	}));

	const uncategorizedVocabs = initialVocabularies.filter((v) => !v.categoryId);

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

			{/* 單字庫 */}
			<div className="flex flex-col gap-4">
				<div className="flex items-center justify-between">
					<h2 className="text-lg font-semibold text-foreground">單字庫</h2>
					<div className="flex gap-2">
						<Button
							variant="outline"
							onClick={() => {
								setBatchOpen(true);
								setBatchText("");
								setBatchDuplicates([]);
							}}
						>
							批次新增
						</Button>
						<Button onClick={() => setShowCatInput((s) => !s)}>
							+ 新增分類
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
								建立
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

				{initialCategories.length === 0 && uncategorizedVocabs.length === 0 ? (
					<div className="text-center py-12 text-muted-foreground">
						<p className="text-4xl mb-3">📂</p>
						<p className="font-medium">先新增分類，再加入單字</p>
						<p className="text-sm mt-1">點右上角「+ 新增分類」開始</p>
					</div>
				) : (
					<>
						{groups.map(({ cat, vocabs }) => (
							<CategorySection
								key={cat.id}
								cat={cat}
								vocabs={vocabs}
								languageId={language.id}
								ttsCode={language.ttsCode}
								isChineseLanguage={language.ttsCode === "zh-TW"}
								categories={initialCategories}
								onDelete={handleDeleteVocab}
								onDeleteCategory={handleDeleteCategory}
							/>
						))}
						{uncategorizedVocabs.length > 0 && (
							<div className="bg-card rounded-2xl border border-border p-4">
								<p className="font-semibold text-foreground mb-2">
									未分類 ({uncategorizedVocabs.length})
								</p>
								{uncategorizedVocabs.map((vocab) => (
									<div key={vocab.id} className="px-2 py-1">
										<VocabCard
											vocab={vocab}
											ttsCode={language.ttsCode}
											onDelete={() => handleDeleteVocab(vocab.id)}
										/>
									</div>
								))}
							</div>
						)}
					</>
				)}
			</div>

			{/* 刪除確認對話框 */}
			<AlertDialog
				open={!!pendingDelete}
				onOpenChange={(open) => !open && setPendingDelete(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>確認刪除</AlertDialogTitle>
						<AlertDialogDescription>
							{pendingDelete?.type === "vocab"
								? `確定刪除「${pendingDelete.name}」？此操作無法復原。`
								: `確定刪除分類「${pendingDelete?.name}」？此分類底下的所有單字將一併刪除，此操作無法復原。`}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>取消</AlertDialogCancel>
						<AlertDialogAction
							onClick={confirmDelete}
							className="bg-destructive text-white hover:bg-destructive/90"
						>
							刪除
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			<Dialog
				open={batchOpen}
				onOpenChange={(open) => {
					setBatchOpen(open);
					if (!open) {
						setBatchText("");
						setBatchDuplicates([]);
					}
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>批次新增分類</DialogTitle>
						<DialogDescription>每行輸入一個分類名稱</DialogDescription>
					</DialogHeader>
					<div className="flex flex-col gap-2">
						<Textarea
							autoFocus
							rows={8}
							placeholder={"動詞\n名詞\n形容詞"}
							value={batchText}
							onChange={(e) => {
								setBatchText(e.target.value);
								if (batchDuplicates.length > 0) setBatchDuplicates([]);
							}}
						/>
						{batchDuplicates.length > 0 && (
							<p className="text-sm text-destructive">
								以下名稱重複，請修改後再送出：
								{batchDuplicates.map((d) => (
									<span key={d} className="block font-medium">
										・{d}
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
							{isBatchSubmitting ? "建立中…" : "建立"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
