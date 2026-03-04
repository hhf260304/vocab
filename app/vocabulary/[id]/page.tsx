"use client";

import { useParams, useRouter } from "next/navigation";
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
import { useVocabStore } from "@/lib/store";
import type { VocabFormData } from "@/lib/types";

export default function EditVocabPage() {
	const router = useRouter();
	const { id } = useParams<{ id: string }>();
	const { vocabularies, updateVocabulary, deleteVocabulary } = useVocabStore();
	const vocab = vocabularies.find((v) => v.id === id);
	const [vocabError, setVocabError] = useState("");

	if (!vocab) {
		return <p className="text-muted-foreground">找不到單字</p>;
	}

	function handleSubmit(data: VocabFormData) {
		const isDuplicate = vocabularies.some((v) => {
			if (v.id === id) return false;
			const shareCategory = data.categoryIds.some((cid) =>
				v.categoryIds.includes(cid),
			);
			return shareCategory && v.japanese === data.japanese;
		});
		if (isDuplicate) {
			setVocabError(`「${data.japanese}」已存在於相同分類中`);
			return;
		}
		updateVocabulary(id, data);
		router.push("/vocabulary");
	}

	function handleDelete() {
		deleteVocabulary(id);
		router.push("/vocabulary");
	}

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
					initialData={vocab}
					onSubmit={handleSubmit}
					submitLabel="儲存變更"
					showCategorySelector
				/>
			</div>
		</div>
	);
}
