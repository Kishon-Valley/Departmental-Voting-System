import StatusBadge from '../StatusBadge'

export default function StatusBadgeExample() {
  return (
    <div className="flex gap-3">
      <StatusBadge status="upcoming" />
      <StatusBadge status="active" />
      <StatusBadge status="closed" />
    </div>
  )
}
