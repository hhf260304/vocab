interface Props {
  label: string
  value: number
  highlight?: boolean
}

export default function StatsCard({ label, value, highlight }: Props) {
  return (
    <div className={`rounded-2xl p-5 flex flex-col items-center gap-1 ${
      highlight ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200'
    }`}>
      <span className={`text-3xl font-bold ${highlight ? 'text-white' : 'text-indigo-600'}`}>
        {value}
      </span>
      <span className={`text-sm ${highlight ? 'text-indigo-100' : 'text-gray-500'}`}>
        {label}
      </span>
    </div>
  )
}
