function LoadingSpinner({ text = 'جاري تحميل البيانات...' }) {
  return (
    <div className="flex min-h-[220px] items-center justify-center">
      <div className="flex items-center gap-3 rounded-lg bg-white px-5 py-4 shadow-sm">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
        <span className="text-sm font-medium text-slate-600">{text}</span>
      </div>
    </div>
  )
}

export default LoadingSpinner
