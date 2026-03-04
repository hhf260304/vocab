// components/VocabForm.tsx
"use client";

import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { useState } from "react";
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
import type { VocabFormData } from "@/lib/types";
import { cn } from "@/lib/utils";

type CategoryLike = { id: string; name: string };

interface Props {
  categories: CategoryLike[];
  initialData?: VocabFormData & { id?: string };
  onSubmit: (data: VocabFormData) => void;
  onCreateCategory?: (name: string) => Promise<CategoryLike>;
  submitLabel: string;
  showCategorySelector?: boolean;
}

export default function VocabForm({
  categories,
  initialData,
  onSubmit,
  onCreateCategory,
  submitLabel,
  showCategorySelector = false,
}: Props) {
  const [catOpen, setCatOpen] = useState(false);
  const [catSearch, setCatSearch] = useState("");
  const [form, setForm] = useState<VocabFormData>({
    japanese: "",
    chinese: "",
    exampleJp: "",
    categoryId: null,
    ...initialData,
  });

  function speak(text: string) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ja-JP";
    speechSynthesis.speak(utterance);
  }

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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.japanese || !form.chinese) return;
    onSubmit(form);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="japanese">日文 *</Label>
        <div className="flex gap-2">
          <Input
            id="japanese"
            value={form.japanese}
            onChange={(e) => setField("japanese", e.target.value)}
            placeholder="例：食べる"
            required
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => speak(form.japanese)}
            title="朗讀"
          >
            🔊
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="chinese">中文意思 *</Label>
        <Input
          id="chinese"
          value={form.chinese}
          onChange={(e) => setField("chinese", e.target.value)}
          placeholder="例：吃"
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="exampleJp">例句（日文）</Label>
        <Input
          id="exampleJp"
          value={form.exampleJp}
          onChange={(e) => setField("exampleJp", e.target.value)}
          placeholder="例：ご飯を食べる。"
        />
      </div>

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
                              : "opacity-0"
                          )}
                        />
                        {cat.name}
                      </CommandItem>
                    ))}
                    {catSearch.trim() &&
                      !categories.some(
                        (c) =>
                          c.name.toLowerCase() ===
                          catSearch.trim().toLowerCase()
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

      <Button type="submit" className="w-full mt-2">
        {submitLabel}
      </Button>
    </form>
  );
}
