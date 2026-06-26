interface StatBarProps {
  label: string
  value: number
  max?: number
  showValue?: boolean
  colorOverride?: string
}

function getStatColor(value: number, max: number): string {
  const ratio = value / max
  if (ratio >= 0.75) return 'bg-champ-success'
  if (ratio >= 0.5) return 'bg-champ-blue'
  if (ratio >= 0.3) return 'bg-champ-gold'
  return 'bg-champ-danger'
}

function getStatLabel(label: string): string {
  const map: Record<string, string> = {
    hp: 'HP',
    atk: 'Atk',
    def: 'Def',
    spa: 'SpA',
    spd: 'SpD',
    spe: 'Spe',
  }
  return map[label.toLowerCase()] ?? label
}

export default function StatBar({
  label,
  value,
  max = 255,
  showValue = true,
  colorOverride,
}: StatBarProps) {
  const pct = Math.min(100, (value / max) * 100)
  const color = colorOverride ?? getStatColor(value, max)

  return (
    <div className="flex items-center gap-3">
      <span className="w-8 text-xs font-medium text-champ-muted font-body text-right shrink-0">
        {getStatLabel(label)}
      </span>
      <span className="w-8 text-xs font-bold text-white font-body text-right shrink-0">
        {value}
      </span>
      <div className="flex-1 h-2 bg-champ-border rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
