function Toast({ show, type = 'success', message, onClose }) {
  if (!show || !message) return null

  const styles =
    type === 'error'
      ? 'bg-red-100 text-red-700 border-red-200'
      : 'bg-emerald-100 text-emerald-700 border-emerald-200'

  return (
    <div className="fixed left-4 top-4 z-70">
      <div className={`min-w-[260px] rounded-lg border px-4 py-3 shadow-lg ${styles}`}>
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-semibold">{message}</p>
          <button type="button" className="text-xs font-bold" onClick={onClose}>
            اغلاق
          </button>
        </div>
      </div>
    </div>
  )
}

export default Toast
