import { Category } from '@/lib/types'

interface Props {
  category: Category
  onDelete?: () => void
}

export default function CategoryTag({ category, onDelete }: Props) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white"
      style={{ backgroundColor: category.color }}
    >
      {category.name}
      {onDelete && (
        <button
          onClick={onDelete}
          className="ml-0.5 hover:opacity-70 transition-opacity"
          aria-label={`刪除分類 ${category.name}`}
        >
          ×
        </button>
      )}
    </span>
  )
}
