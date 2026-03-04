"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import VocabForm from "@/components/VocabForm";
import { useVocabStore } from "@/lib/store";
import type { VocabFormData } from "@/lib/types";

function NewVocabPageInner() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const categoryId = searchParams.get("categoryId");
	const { addVocabulary, categories, vocabularies } = useVocabStore();
	const category = categories.find((c) => c.id === categoryId);
	const [vocabError, setVocabError] = useState("");

	function handleSubmit(data: VocabFormData) {
		const targetCategoryId = category ? category.id : null;
		const isDuplicate = vocabularies.some((v) => {
			const inSameCategory = targetCategoryId
				? v.categoryIds.includes(targetCategoryId)
				: v.categoryIds.length === 0;
			return inSameCategory && v.japanese === data.japanese;
		});
		if (isDuplicate) {
			setVocabError(`「${data.japanese}」已存在於此分類中`);
			return;
		}
		addVocabulary({
			...data,
			categoryIds: category ? [category.id] : [],
		});
		router.push("/vocabulary");
	}

	return (
		<div className="flex flex-col gap-6">
			<div>
				<h1 className="text-2xl font-bold text-stone-900">新增單字</h1>
				<p className="text-stone-500 text-sm mt-1">
					{category
						? `加入「${category.name}」分類`
						: "加入新的日文單字到你的單字庫"}
				</p>
			</div>
			<div className="bg-card rounded-2xl border border-border p-6">
				{vocabError && (
					<p className="text-destructive text-sm mb-4">{vocabError}</p>
				)}
				<VocabForm onSubmit={handleSubmit} submitLabel="新增單字" />
			</div>
		</div>
	);
}

export default function NewVocabPage() {
	return (
		<Suspense fallback={null}>
			<NewVocabPageInner />
		</Suspense>
	);
}
