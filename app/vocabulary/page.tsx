"use client";

import Link from "next/link";
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
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import VocabCard from "@/components/VocabCard";
import { useVocabStore } from "@/lib/store";
import type { Category, Vocabulary } from "@/lib/types";

function CategorySection({
	cat,
	name,
	vocabs,
	categories,
	onDelete,
	onDeleteCategory,
}: {
	cat?: Category;
	name: string;
	vocabs: Vocabulary[];
	categories: Category[];
	onDelete: (id: string) => void;
	onDeleteCategory?: (id: string) => void;
}) {
	const [open, setOpen] = useState(false);

	return (
		<Collapsible
			open={open}
			onOpenChange={setOpen}
			className="bg-card rounded-2xl border border-border overflow-hidden"
		>
			<div className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/50 transition-colors">
				<CollapsibleTrigger className="flex items-center gap-2 flex-1 text-left">
					<span className="font-semibold text-foreground">{name}</span>
					<span className="text-sm text-muted-foreground">
						{vocabs.length} 個單字
					</span>
					<span className="text-muted-foreground text-xs ml-auto">
						{open ? "▼" : "▶"}
					</span>
				</CollapsibleTrigger>
				<div className="flex items-center gap-2 ml-3 shrink-0">
					{cat && (
						<Button size="sm" asChild>
							<Link href={`/vocabulary/new?categoryId=${cat.id}`}>+ 單字</Link>
						</Button>
					)}
					{cat && onDeleteCategory && (
						<Button
							variant="ghost"
							size="sm"
							className="text-muted-foreground hover:text-destructive px-2"
							onClick={() => onDeleteCategory(cat.id)}
							aria-label={`刪除分類「${name}」`}
						>
							×
						</Button>
					)}
				</div>
			</div>
			<CollapsibleContent>
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
									categories={categories}
									onDelete={() => onDelete(vocab.id)}
								/>
							</div>
						))
					)}
				</div>
			</CollapsibleContent>
		</Collapsible>
	);
}

export default function VocabularyPage() {
	const {
		vocabularies,
		categories,
		deleteVocabulary,
		addCategory,
		deleteCategory,
	} = useVocabStore();
	const [showCatInput, setShowCatInput] = useState(false);
	const [newCatName, setNewCatName] = useState("");
	const [catError, setCatError] = useState("");
	const [pendingDelete, setPendingDelete] = useState<{
		type: "vocab" | "category";
		id: string;
		name: string;
	} | null>(null);

	const filtered = vocabularies;

	function handleDelete(id: string) {
		const vocab = vocabularies.find((v) => v.id === id);
		if (vocab) setPendingDelete({ type: "vocab", id, name: vocab.japanese });
	}

	function handleDeleteCategory(id: string) {
		const cat = categories.find((c) => c.id === id);
		if (cat) setPendingDelete({ type: "category", id, name: cat.name });
	}

	function confirmDelete() {
		if (!pendingDelete) return;
		if (pendingDelete.type === "vocab") {
			deleteVocabulary(pendingDelete.id);
		} else {
			deleteCategory(pendingDelete.id);
		}
		setPendingDelete(null);
	}

	function handleAddCategory(e: React.FormEvent) {
		e.preventDefault();
		const trimmed = newCatName.trim();
		if (!trimmed) return;
		const isDuplicate = categories.some(
			(c) => c.name.trim().toLowerCase() === trimmed.toLowerCase(),
		);
		if (isDuplicate) {
			setCatError(`「${trimmed}」分類已存在`);
			return;
		}
		addCategory(trimmed);
		setNewCatName("");
		setCatError("");
		setShowCatInput(false);
	}

	const groups = categories.map((cat) => ({
		cat,
		vocabs: filtered.filter((v) => v.categoryIds.includes(cat.id)),
	}));

	const uncategorized = filtered.filter((v) => v.categoryIds.length === 0);

	return (
		<div className="flex flex-col gap-5">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-bold text-foreground">單字庫</h1>
				<Button onClick={() => setShowCatInput((s) => !s)}>+ 新增分類</Button>
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
						<Button type="submit">建立</Button>
						<Button
							type="button"
							variant="outline"
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

			{categories.length === 0 ? (
				<div className="text-center py-12 text-muted-foreground">
					<p className="text-4xl mb-3">📂</p>
					<p className="font-medium">先新增分類，再加入單字</p>
					<p className="text-sm mt-1">點右上角「+ 新增分類」開始</p>
				</div>
			) : (
				<div className="flex flex-col gap-4">
					{groups.map(({ cat, vocabs }) => (
						<CategorySection
							key={cat.id}
							cat={cat}
							name={cat.name}
							vocabs={vocabs}
							categories={categories}
							onDelete={handleDelete}
							onDeleteCategory={handleDeleteCategory}
						/>
					))}
					{uncategorized.length > 0 && (
						<CategorySection
							name="未分類"
							vocabs={uncategorized}
							categories={categories}
							onDelete={handleDelete}
						/>
					)}
				</div>
			)}

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
								: `確定刪除分類「${pendingDelete?.name}」？僅屬於此分類的單字將一併刪除，同時屬於其他分類的單字會保留。`}
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
		</div>
	);
}
