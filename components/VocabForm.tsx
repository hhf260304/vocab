// components/VocabForm.tsx
"use client";

import { Check, ChevronsUpDown, Plus, Volume2 } from "lucide-react";
import { useRef, useState } from "react";
import { ThreeDots } from "react-loader-spinner";
import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { PRESET_LANGUAGES } from "@/lib/languages-config";
import type { VocabFormData } from "@/lib/types";
import { cn } from "@/lib/utils";
import { lookupZhuyin } from "@/lib/actions/zhuyin";

type CategoryLike = { id: string; name: string };
type LanguageLike = { id: string; name: string; ttsCode: string };

interface Props {
	categories: CategoryLike[];
	languages: LanguageLike[];
	initialData?: VocabFormData & { id?: string };
	onSubmit: (data: VocabFormData) => Promise<void>;
	onCreateCategory?: (name: string) => Promise<CategoryLike>;
	onCreateLanguage?: (name: string, ttsCode: string) => Promise<LanguageLike>;
	submitLabel: string;
	showCategorySelector?: boolean;
	showLanguageSelector?: boolean;
}

export default function VocabForm({
	categories,
	languages,
	initialData,
	onSubmit,
	onCreateCategory,
	onCreateLanguage,
	submitLabel,
	showCategorySelector = false,
	showLanguageSelector = true,
}: Props) {
	const [catOpen, setCatOpen] = useState(false);
	const [catSearch, setCatSearch] = useState("");
	const [langOpen, setLangOpen] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [zhuyinLoading, setZhuyinLoading] = useState(false);
	const [zhuyinNotFound, setZhuyinNotFound] = useState(false);
	const zhuyinAbortedRef = useRef(false);
	const [form, setForm] = useState<VocabFormData>({
		front: "",
		back: "",
		exampleJp: "",
		zhuyin: "",
		categoryId: null,
		languageId: null,
		...initialData,
	});

	function setField(field: keyof VocabFormData, value: string | null) {
		setForm((f) => ({ ...f, [field]: value }));
	}

	function handleSelectCategory(catId: string) {
		setField("categoryId", form.categoryId === catId ? null : catId);
		setCatOpen(false);
		setCatSearch("");
	}

	async function handleCreateCategory() {
		const trimmed = catSearch.trim();
		if (!trimmed || !onCreateCategory) return;
		const created = await onCreateCategory(trimmed);
		setField("categoryId", created.id);
		setCatOpen(false);
		setCatSearch("");
	}

	function handleSelectLanguage(langId: string) {
		setField("languageId", form.languageId === langId ? null : langId);
		setLangOpen(false);
		setZhuyinNotFound(false);
	}

	async function handleCreatePresetLanguage(name: string, ttsCode: string) {
		if (!onCreateLanguage) return;
		const created = await onCreateLanguage(name, ttsCode);
		setField("languageId", created.id);
		setLangOpen(false);
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!form.front || !form.back) return;
		setIsSubmitting(true);
		try {
			await onSubmit(form);
		} finally {
			setIsSubmitting(false);
		}
	}

	const isChineseLanguage = languages.find((l) => l.id === form.languageId)?.ttsCode === "zh-TW";

	const selectedLang = languages.find((l) => l.id === form.languageId);

	async function handleBackBlur() {
		if (!isChineseLanguage || !form.back.trim() || zhuyinLoading) return;
		zhuyinAbortedRef.current = false;
		setZhuyinLoading(true);
		setZhuyinNotFound(false);
		const result = await lookupZhuyin(form.back);
		if (!zhuyinAbortedRef.current) {
			if (result !== null) {
				setField("zhuyin", result);
			} else {
				setZhuyinNotFound(true);
			}
			setZhuyinLoading(false);
		}
	}

	// 預設清單中尚未被使用者建立的語言
	const availablePresets = PRESET_LANGUAGES.filter(
		(p) => !languages.some((l) => l.name === p.name),
	);

	return (
		<form onSubmit={handleSubmit} className="flex flex-col gap-5">
			{/* 語言選擇 */}
			{showLanguageSelector && (
				<div className="flex flex-col gap-1.5">
					<Label>語言 *</Label>
					<Popover open={langOpen} onOpenChange={setLangOpen}>
						<PopoverTrigger asChild>
							<Button
								type="button"
								variant="outline"
								role="combobox"
								aria-expanded={langOpen}
								className="w-full justify-between font-normal"
							>
								{selectedLang ? selectedLang.name : "— 選擇語言 —"}
								<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
							</Button>
						</PopoverTrigger>
						<PopoverContent className="w-full p-0" align="start">
							<Command>
								<CommandList>
									{languages.length > 0 && (
										<CommandGroup heading="我的語言">
											{languages.map((lang) => (
												<CommandItem
													key={lang.id}
													value={lang.id}
													onSelect={() => handleSelectLanguage(lang.id)}
												>
													<Check
														className={cn(
															"mr-2 h-4 w-4",
															form.languageId === lang.id
																? "opacity-100"
																: "opacity-0",
														)}
													/>
													{lang.name}
												</CommandItem>
											))}
										</CommandGroup>
									)}
									{availablePresets.length > 0 && (
										<CommandGroup heading="新增語言">
											{availablePresets.map((p) => (
												<CommandItem
													key={p.ttsCode}
													value={p.name}
													onSelect={() =>
														handleCreatePresetLanguage(p.name, p.ttsCode)
													}
													className="text-muted-foreground"
												>
													<Plus className="mr-2 h-4 w-4" />
													{p.name}
												</CommandItem>
											))}
										</CommandGroup>
									)}
								</CommandList>
							</Command>
						</PopoverContent>
					</Popover>
				</div>
			)}

			{/* 正面 */}
			<div className="flex flex-col gap-1.5">
				<Label htmlFor="front">正面（母語）*</Label>
				<Input
					id="front"
					value={form.front}
					onChange={(e) => setField("front", e.target.value)}
					required
				/>
			</div>

			{/* 反面 */}
			<div className="flex flex-col gap-1.5">
				<Label htmlFor="back">反面（目標語言）*</Label>
				<div className="flex gap-2">
					<Input
						id="back"
						value={form.back}
						onChange={(e) => {
							setField("back", e.target.value);
							if (zhuyinLoading) {
								zhuyinAbortedRef.current = true;
								setZhuyinLoading(false);
							}
						}}
						onBlur={handleBackBlur}
						required
					/>
					{selectedLang && (
						<Button
							type="button"
							variant="outline"
							size="icon"
							disabled={!form.back}
							onClick={() => {
								const utterance = new SpeechSynthesisUtterance(form.back);
								utterance.lang = selectedLang.ttsCode;
								speechSynthesis.speak(utterance);
							}}
						>
							<Volume2 className="h-4 w-4" />
						</Button>
					)}
				</div>
			</div>

			{/* 注音（中文）或例句（其他語言） */}
			{isChineseLanguage ? (
				<div className="flex flex-col gap-1.5">
					<Label htmlFor="zhuyin">注音</Label>
					<Input
						id="zhuyin"
						value={form.zhuyin}
						onChange={(e) => {
							setField("zhuyin", e.target.value);
							setZhuyinNotFound(false);
						}}
						disabled={zhuyinLoading}
					/>
					{zhuyinLoading && (
						<p className="text-xs text-muted-foreground">查詢中…</p>
					)}
					{zhuyinNotFound && !zhuyinLoading && (
						<p className="text-xs text-muted-foreground">查無結果，請手動輸入</p>
					)}
				</div>
			) : (
				<div className="flex flex-col gap-1.5">
					<Label htmlFor="exampleJp">例句</Label>
					<Input
						id="exampleJp"
						value={form.exampleJp}
						onChange={(e) => setField("exampleJp", e.target.value)}
					/>
				</div>
			)}

			{/* 分類（可選） */}
			{showCategorySelector && (
				<div className="flex flex-col gap-1.5">
					<Label>分類</Label>
					<Popover open={catOpen} onOpenChange={setCatOpen}>
						<PopoverTrigger asChild>
							<Button
								type="button"
								variant="outline"
								role="combobox"
								aria-expanded={catOpen}
								className="w-full justify-between font-normal"
							>
								{form.categoryId
									? (categories.find((c) => c.id === form.categoryId)?.name ??
										"— 不指定分類 —")
									: "— 不指定分類 —"}
								<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
							</Button>
						</PopoverTrigger>
						<PopoverContent className="w-full p-0" align="start">
							<Command>
								<CommandInput
									placeholder="搜尋或輸入新分類…"
									value={catSearch}
									onValueChange={setCatSearch}
								/>
								<CommandList>
									<CommandEmpty>
										{catSearch.trim() ? (
											<button
												type="button"
												onClick={handleCreateCategory}
												className="flex w-full items-center gap-2 px-2 py-1.5 text-sm hover:bg-accent"
											>
												<Plus className="h-4 w-4" />
												建立「{catSearch.trim()}」
											</button>
										) : (
											<p className="py-2 text-center text-sm text-muted-foreground">
												尚無分類
											</p>
										)}
									</CommandEmpty>
									<CommandGroup>
										{categories.map((cat) => (
											<CommandItem
												key={cat.id}
												value={cat.name}
												onSelect={() => handleSelectCategory(cat.id)}
											>
												<Check
													className={cn(
														"mr-2 h-4 w-4",
														form.categoryId === cat.id
															? "opacity-100"
															: "opacity-0",
													)}
												/>
												{cat.name}
											</CommandItem>
										))}
										{catSearch.trim() &&
											!categories.some(
												(c) =>
													c.name.toLowerCase() ===
													catSearch.trim().toLowerCase(),
											) && (
												<CommandItem
													value={`__create__${catSearch}`}
													onSelect={handleCreateCategory}
													className="text-muted-foreground"
												>
													<Plus className="mr-2 h-4 w-4" />
													建立「{catSearch.trim()}」
												</CommandItem>
											)}
									</CommandGroup>
								</CommandList>
							</Command>
						</PopoverContent>
					</Popover>
				</div>
			)}

			<Button type="submit" className="w-full mt-2" disabled={isSubmitting || zhuyinLoading}>
				{isSubmitting ? (
					<ThreeDots height="20" width="40" color="currentColor" />
				) : (
					submitLabel
				)}
			</Button>
		</form>
	);
}
