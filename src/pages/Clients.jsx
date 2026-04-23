import { useEffect, useState } from 'react'
import {
  createClient,
  deleteClient,
  getClients,
  updateClient,
} from '../api/clients'
import LoadingSpinner from '../components/LoadingSpinner'
import Modal from '../components/Modal'
import Toast from '../components/Toast'
import ConfirmDialog from '../components/ConfirmDialog'

const INITIAL_FORM = { name: '', phone: '', email: '' }

const extractList = (payload) => {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.data)) return payload.data
  return []
}

function Clients() {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingClient, setEditingClient] = useState(null)
  const [form, setForm] = useState(INITIAL_FORM)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [toast, setToast] = useState({ show: false, type: 'success', message: '' })

  const loadClients = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await getClients()
      setClients(extractList(response.data))
    } catch {
      setError('تعذر تحميل بيانات العملاء. الرجاء المحاولة لاحقًا.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadClients()
  }, [])

  const openAddModal = () => {
    setEditingClient(null)
    setForm(INITIAL_FORM)
    setIsModalOpen(true)
  }

  const openEditModal = (client) => {
    setEditingClient(client)
    setForm({
      name: client.name || '',
      phone: client.phone || '',
      email: client.email || '',
    })
    setIsModalOpen(true)
  }

  const submitForm = async (event) => {
    event.preventDefault()
    setIsSubmitting(true)
    setError('')
    try {
      if (editingClient?.id) {
        await updateClient(editingClient.id, form)
        setToast({ show: true, type: 'success', message: 'تم تحديث العميل بنجاح.' })
      } else {
        await createClient(form)
        setToast({ show: true, type: 'success', message: 'تمت إضافة العميل بنجاح.' })
      }
      setIsModalOpen(false)
      await loadClients()
    } catch {
      setError('تعذر حفظ بيانات العميل. تأكد من صحة المدخلات.')
      setToast({ show: true, type: 'error', message: 'تعذر حفظ بيانات العميل.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const onDelete = async () => {
    if (!confirmDeleteId) return
    try {
      await deleteClient(confirmDeleteId)
      await loadClients()
      setToast({ show: true, type: 'success', message: 'تم حذف العميل بنجاح.' })
      setConfirmDeleteId(null)
    } catch {
      setError('حدث خطأ أثناء حذف العميل.')
      setToast({ show: true, type: 'error', message: 'تعذر حذف العميل.' })
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-5">
      <Toast
        show={toast.show}
        type={toast.type}
        message={toast.message}
        onClose={() => setToast({ show: false, type: 'success', message: '' })}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900">العملاء</h1>
          <p className="text-sm text-slate-500">إدارة بيانات العملاء ومشاريعهم</p>
        </div>
        <button
          type="button"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
          onClick={openAddModal}
        >
          إضافة عميل
        </button>
      </div>

      {error && <div className="rounded-lg bg-red-100 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="overflow-x-auto rounded-xl bg-white p-4 shadow-sm">
        <table className="min-w-full text-right text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-3 py-2">الاسم</th>
              <th className="px-3 py-2">الهاتف</th>
              <th className="px-3 py-2">البريد الإلكتروني</th>
              <th className="px-3 py-2">عدد المشاريع</th>
              <th className="px-3 py-2">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => (
              <tr key={client.id} className="border-b border-slate-100">
                <td className="px-3 py-3 font-medium">{client.name}</td>
                <td className="px-3 py-3">{client.phone || '-'}</td>
                <td className="px-3 py-3">{client.email || '-'}</td>
                <td className="px-3 py-3">{client.projects_count ?? client.projects?.length ?? 0}</td>
                <td className="px-3 py-3">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="rounded bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700"
                      onClick={() => openEditModal(client)}
                    >
                      تعديل
                    </button>
                    <button
                      type="button"
                      className="rounded bg-red-100 px-3 py-1 text-xs font-semibold text-red-700"
                      onClick={() => setConfirmDeleteId(client.id)}
                    >
                      حذف
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={isModalOpen}
        title={editingClient ? 'تعديل بيانات العميل' : 'إضافة عميل جديد'}
        onClose={() => setIsModalOpen(false)}
      >
        <form className="space-y-3" onSubmit={submitForm}>
          <input
            type="text"
            className="w-full rounded-lg border border-slate-200 px-3 py-2"
            placeholder="اسم العميل"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            required
          />
          <input
            type="text"
            className="w-full rounded-lg border border-slate-200 px-3 py-2"
            placeholder="رقم الهاتف"
            value={form.phone}
            onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
          />
          <input
            type="email"
            className="w-full rounded-lg border border-slate-200 px-3 py-2"
            placeholder="البريد الإلكتروني"
            value={form.email}
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
          />
          <button
            type="submit"
            className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'جاري الحفظ...' : 'حفظ'}
          </button>
        </form>
      </Modal>
      <ConfirmDialog isOpen={Boolean(confirmDeleteId)} onCancel={() => setConfirmDeleteId(null)} onConfirm={onDelete} />
    </div>
  )
}

export default Clients
