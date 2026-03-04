"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getNextReviewAt, isDueToday } from "./srs";
import type { Category, VocabFormData, Vocabulary } from "./types";

function generateId(): string {
	return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

interface VocabStore {
	vocabularies: Vocabulary[];
	categories: Category[];
	addVocabulary: (data: VocabFormData) => void;
	updateVocabulary: (id: string, data: Partial<VocabFormData>) => void;
	deleteVocabulary: (id: string) => void;
	addCategory: (name: string) => void;
	deleteCategory: (id: string) => void;
	markReview: (id: string, remembered: boolean) => void;
	getTodayReviews: () => Vocabulary[];
}

export const useVocabStore = create<VocabStore>()(
	persist(
		(set, get) => ({
			vocabularies: [],
			categories: [],

			addVocabulary: (data) =>
				set((state) => ({
					vocabularies: [
						...state.vocabularies,
						{
							...data,
							id: generateId(),
							createdAt: Date.now(),
							reviewStage: 0,
							nextReviewAt: Date.now(),
						},
					],
				})),

			updateVocabulary: (id, data) =>
				set((state) => ({
					vocabularies: state.vocabularies.map((v) =>
						v.id === id ? { ...v, ...data } : v,
					),
				})),

			deleteVocabulary: (id) =>
				set((state) => ({
					vocabularies: state.vocabularies.filter((v) => v.id !== id),
				})),

			addCategory: (name) =>
				set((state) => ({
					categories: [...state.categories, { id: generateId(), name }],
				})),

			deleteCategory: (id) =>
				set((state) => ({
					categories: state.categories.filter((c) => c.id !== id),
					vocabularies: state.vocabularies
						.filter(
							(v) => !(v.categoryIds.length === 1 && v.categoryIds[0] === id),
						)
						.map((v) => ({
							...v,
							categoryIds: v.categoryIds.filter((cid) => cid !== id),
						})),
				})),

			markReview: (id, remembered) =>
				set((state) => {
					const vocab = state.vocabularies.find((v) => v.id === id);
					if (!vocab) return state;
					const { stage, nextReviewAt } = getNextReviewAt(
						vocab.reviewStage,
						remembered,
					);
					return {
						vocabularies: state.vocabularies.map((v) =>
							v.id === id
								? {
										...v,
										reviewStage: stage as Vocabulary["reviewStage"],
										nextReviewAt,
										lastReviewedAt: Date.now(),
									}
								: v,
						),
					};
				}),

			getTodayReviews: () => {
				return get().vocabularies.filter(
					(v) => v.reviewStage < 5 && isDueToday(v.nextReviewAt),
				);
			},
		}),
		{ name: "japanese-vocab-store" },
	),
);
