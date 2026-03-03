interface Props {
  label: string
  value: number
  highlight?: boolean
}

export default function StatsCard({ label, value, highlight }: Props) {
  return (
    <div className={`rounded-2xl p-5 flex flex-col items-center gap-1 ${
      highlight ? 'bg-orange-700 text-white' : 'bg-white border border-stone-200'
    }`}>
      <span className={`text-3xl font-bold ${highlight ? 'text-white' : 'text-stone-900'}`}>
        {value}
      </span>
      <span className={`text-sm ${highlight ? 'text-orange-100' : 'text-stone-500'}`}>
        {label}
      </span>
    </div>
  )
}
