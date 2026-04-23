import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { createProject, deleteProject, getProjects } from '../api/projects'
import { getClients } from '../api/clients'
import LoadingSpinner from '../components/LoadingSpinner'
import Modal from '../components/Modal'
import StatusBadge from '../components/StatusBadge'
import Toast from '../components/Toast'
import ConfirmDialog from '../components/ConfirmDialog'

const extractList = (payload) => {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.data)) return payload.data
  return []
}

const INITIAL_PROJECT = {
  name: '',
  client_id: '',
  type: '',
  area_m2: '',
  status: 'planning',
  start_date: '',
  end_date: '',
  notes: '',
}

const PROJECT_TYPES = [
  { value: 'house', label: 'فيلا' },
  { value: 'workshop', label: 'ورشة' },
  { value: 'building', label: 'مبنى' },
  { value: 'other', label: 'أخرى' },
]

const PROJECT_STATUSES = [
  { value: 'planning', label: 'تخطيط' },
  { value: 'in_progress', label: 'قيد التنفيذ' },
  { value: 'completed', label: 'مكتمل' },
  { value: 'cancelled', label: 'ملغي' },
]

const formatDate = (value) => (value ? value.slice(0, 10) : '')
const formatDisplayDate = (value) => (value ? new Date(value).toLocaleDateString('ar-EG') : '-')
const getTypeLabel = (type) => PROJECT_TYPES.find((item) => item.value === type)?.label || '-'

const extractValidationErrors = (apiError) => {
  const errors = apiError?.response?.data?.errors
  if (!errors || typeof errors !== 'object') return []
  return Object.values(errors).flat().map((message) => String(message))
}

function Projects() {
  const [projects, setProjects] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [clientsLoading, setClientsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [validationErrors, setValidationErrors] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [toast, setToast] = useState({ show: false, type: 'success', message: '' })
  const [newProject, setNewProject] = useState(INITIAL_PROJECT)

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      const projectsRes = await getProjects()
      setProjects(extractList(projectsRes.data))
    } catch {
      setError('تعذر تحميل المشاريع. الرجاء التحقق من الاتصال بالخادم.')
    } finally {
      setLoading(false)
    }
  }

  const loadClientsForModal = async () => {
    setClientsLoading(true)
    try {
      const clientsRes = await getClients()
      setClients(extractList(clientsRes.data))
    } catch {
      setError('تعذر تحميل قائمة العملاء للنموذج.')
    } finally {
      setClientsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const byStatus = statusFilter === 'all' ? true : project.status === statusFilter
      const byName = project.name?.toLowerCase().includes(search.toLowerCase())
      return byStatus && byName
    })
  }, [projects, statusFilter, search])

  const onCreateProject = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')
    setValidationErrors([])

    const payload = {
      client_id: Number(newProject.client_id),
      name: newProject.name.trim(),
      type: newProject.type,
      status: newProject.status,
      start_date: formatDate(newProject.start_date) || null,
      end_date: formatDate(newProject.end_date) || null,
      notes: newProject.notes.trim() || null,
    }

    if (newProject.area_m2 !== '') {
      payload.area_m2 = Number(newProject.area_m2)
    }

    try {
      await createProject(payload)
      setIsModalOpen(false)
      setNewProject(INITIAL_PROJECT)
      setSuccess('تمت إضافة المشروع بنجاح.')
      setToast({ show: true, type: 'success', message: 'تمت إضافة المشروع بنجاح.' })
      await loadData()
    } catch (apiError) {
      if (apiError?.response?.status === 422) {
        const details = extractValidationErrors(apiError)
        setValidationErrors(details)
        setError('بيانات النموذج غير صحيحة. يرجى مراجعة الحقول المطلوبة.')
        return
      }
      setError('تعذر إنشاء المشروع. حاول مرة أخرى.')
      setToast({ show: true, type: 'error', message: 'تعذر إنشاء المشروع. حاول مرة أخرى.' })
    }
  }

  const openProjectModal = async () => {
    setValidationErrors([])
    setSuccess('')
    setError('')
    setNewProject(INITIAL_PROJECT)
    setIsModalOpen(true)
    await loadClientsForModal()
  }

  const onDeleteProject = async () => {
    if (!confirmDeleteId) return
    setIsDeleting(true)
    setError('')
    try {
      await deleteProject(confirmDeleteId)
      setToast({ show: true, type: 'success', message: 'تم حذف المشروع بنجاح.' })
      setConfirmDeleteId(null)
      await loadData()
    } catch {
      setError('تعذر حذف المشروع.')
      setToast({ show: true, type: 'error', message: 'تعذر حذف المشروع.' })
    } finally {
      setIsDeleting(false)
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
          <h1 className="text-2xl font-black text-slate-900">المشاريع</h1>
          <p className="text-sm text-slate-500">متابعة حالة كل مشروع وتفاصيله</p>
        </div>
        <button
          type="button"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
          onClick={openProjectModal}
        >
          إضافة مشروع
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <input
          type="text"
          className="rounded-lg border border-slate-200 bg-white px-3 py-2"
          placeholder="ابحث باسم المشروع"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="rounded-lg border border-slate-200 bg-white px-3 py-2"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">كل الحالات</option>
          <option value="planning">قيد التخطيط</option>
          <option value="in_progress">قيد التنفيذ</option>
          <option value="completed">مكتمل</option>
          <option value="cancelled">ملغي</option>
        </select>
      </div>

      {success && <div className="rounded-lg bg-emerald-100 px-4 py-3 text-sm text-emerald-700">{success}</div>}
      {error && <div className="rounded-lg bg-red-100 px-4 py-3 text-sm text-red-700">{error}</div>}
      {validationErrors.length > 0 && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          <p className="font-semibold">أخطاء التحقق:</p>
          <ul className="mt-1 list-inside list-disc">
            {validationErrors.map((item, index) => (
              <li key={`${item}-${index}`}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl bg-white p-4 shadow-sm">
        <table className="min-w-full text-right text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-3 py-2">الاسم</th>
              <th className="px-3 py-2">العميل</th>
              <th className="px-3 py-2">النوع</th>
              <th className="px-3 py-2">المساحة</th>
              <th className="px-3 py-2">الحالة</th>
              <th className="px-3 py-2">تاريخ البدء</th>
              <th className="px-3 py-2">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {filteredProjects.map((project) => (
              <tr key={project.id} className="border-b border-slate-100">
                <td className="px-3 py-3 font-medium">{project.name}</td>
                <td className="px-3 py-3">{project.client?.name || project.client_name || '-'}</td>
                <td className="px-3 py-3">{getTypeLabel(project.type)}</td>
                <td className="px-3 py-3">{project.area_m2 || project.area || '-'}</td>
                <td className="px-3 py-3">
                  <StatusBadge status={project.status} />
                </td>
                <td className="px-3 py-3">{formatDisplayDate(project.start_date)}</td>
                <td className="px-3 py-3">
                  <div className="flex gap-2">
                    <Link
                      to={`/projects/${project.id}`}
                      className="rounded bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700"
                    >
                      عرض
                    </Link>
                    <button
                      type="button"
                      className="rounded bg-red-100 px-3 py-1 text-xs font-semibold text-red-700"
                      onClick={() => setConfirmDeleteId(project.id)}
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

      <Modal isOpen={isModalOpen} title="إضافة مشروع جديد" onClose={() => setIsModalOpen(false)}>
        <form className="grid gap-3" onSubmit={onCreateProject}>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">
              اسم المشروع <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="w-full rounded-lg border border-slate-200 px-3 py-2"
              value={newProject.name}
              onChange={(e) => setNewProject((prev) => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">
              العميل <span className="text-red-500">*</span>
            </label>
            <select
              className="w-full rounded-lg border border-slate-200 px-3 py-2"
              value={newProject.client_id}
              onChange={(e) => setNewProject((prev) => ({ ...prev, client_id: e.target.value }))}
              required
              disabled={clientsLoading}
            >
              <option value="">{clientsLoading ? 'جاري تحميل العملاء...' : 'اختر العميل'}</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">
              نوع المشروع <span className="text-red-500">*</span>
            </label>
            <select
              className="w-full rounded-lg border border-slate-200 px-3 py-2"
              value={newProject.type}
              onChange={(e) => setNewProject((prev) => ({ ...prev, type: e.target.value }))}
              required
            >
              <option value="">اختر نوع المشروع</option>
              {PROJECT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">المساحة بالمتر المربع</label>
            <input
              type="number"
              className="w-full rounded-lg border border-slate-200 px-3 py-2"
              value={newProject.area_m2}
              onChange={(e) => setNewProject((prev) => ({ ...prev, area_m2: e.target.value }))}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">
              الحالة <span className="text-red-500">*</span>
            </label>
            <select
              className="w-full rounded-lg border border-slate-200 px-3 py-2"
              value={newProject.status}
              onChange={(e) => setNewProject((prev) => ({ ...prev, status: e.target.value }))}
              required
            >
              {PROJECT_STATUSES.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">تاريخ البداية</label>
            <input
              type="date"
              className="w-full rounded-lg border border-slate-200 px-3 py-2"
              value={newProject.start_date}
              onChange={(e) => setNewProject((prev) => ({ ...prev, start_date: e.target.value }))}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">تاريخ النهاية</label>
            <input
              type="date"
              className="w-full rounded-lg border border-slate-200 px-3 py-2"
              value={newProject.end_date}
              onChange={(e) => setNewProject((prev) => ({ ...prev, end_date: e.target.value }))}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">ملاحظات</label>
            <textarea
              className="w-full rounded-lg border border-slate-200 px-3 py-2"
              rows={3}
              value={newProject.notes}
              onChange={(e) => setNewProject((prev) => ({ ...prev, notes: e.target.value }))}
            />
          </div>

          <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
            حفظ المشروع
          </button>
        </form>
      </Modal>
      <ConfirmDialog
        isOpen={Boolean(confirmDeleteId)}
        onCancel={() => setConfirmDeleteId(null)}
        onConfirm={onDeleteProject}
      />
      {isDeleting && <LoadingSpinner text="جاري حذف المشروع..." />}
    </div>
  )
}

export default Projects
