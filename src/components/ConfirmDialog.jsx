import Modal from './Modal'

function ConfirmDialog({ isOpen, onConfirm, onCancel }) {
  return (
    <Modal isOpen={isOpen} title="تأكيد الحذف" onClose={onCancel}>
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-lg bg-red-50 p-3 text-red-700">
          <span className="text-xl">⚠️</span>
          <p className="text-sm font-semibold">
            هل أنت متأكد من حذف هذا العنصر؟ لا يمكن التراجع عن هذا الإجراء.
          </p>
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700"
            onClick={onCancel}
          >
            إلغاء
          </button>
          <button
            type="button"
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white"
            onClick={onConfirm}
          >
            حذف
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default ConfirmDialog
