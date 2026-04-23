function Modal({ isOpen, title, onClose, children }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-xl rounded-xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800">{title}</h3>
          <button
            type="button"
            className="rounded-md bg-slate-100 px-3 py-1 text-sm text-slate-600 hover:bg-slate-200"
            onClick={onClose}
          >
            إغلاق
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export default Modal
