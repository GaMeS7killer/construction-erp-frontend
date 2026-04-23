const STATUS_MAP = {
  planning: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  draft: 'bg-slate-100 text-slate-700',
  sent: 'bg-indigo-100 text-indigo-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
}

const STATUS_LABELS = {
  planning: 'قيد التخطيط',
  in_progress: 'قيد التنفيذ',
  completed: 'مكتمل',
  cancelled: 'ملغي',
  draft: 'مسودة',
  sent: 'مرسل',
  approved: 'معتمد',
  rejected: 'مرفوض',
}

function StatusBadge({ status }) {
  const normalized = status || 'planning'

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${STATUS_MAP[normalized] || 'bg-slate-100 text-slate-700'}`}
    >
      {STATUS_LABELS[normalized] || normalized}
    </span>
  )
}

export default StatusBadge
