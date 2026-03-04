import { Badge } from "@/components/ui/badge";
import type { Category } from "@/lib/types";

interface Props {
	category: Category;
	onDelete?: () => void;
}

export default function CategoryTag({ category, onDelete }: Props) {
	return (
		<Badge className="bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100 gap-1 font-medium">
			{category.name}
			{onDelete && (
				<button
					onClick={onDelete}
					className="ml-0.5 hover:opacity-70 transition-opacity leading-none"
					aria-label={`刪除分類 ${category.name}`}
				>
					×
				</button>
			)}
		</Badge>
	);
}
