import { useCallback, useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { Link, useParams } from 'react-router-dom'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import {
  addPhaseEquipment,
  addPhaseLabor,
  addPhaseMaterial,
  addProjectPhase,
  deleteProjectPhase,
  deletePhaseMaterial,
  deletePhaseLabor,
  deletePhaseEquipment,
  getProjectById,
  patchProject,
  patchPhase,
} from '../api/projects'
import { generateProjectQuotation } from '../api/quotations'
import { getEquipment, getLaborTypes, getMaterials } from '../api/catalogs'
import LoadingSpinner from '../components/LoadingSpinner'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import StatusBadge from '../components/StatusBadge'
import Toast from '../components/Toast'

const extractData = (payload) => payload?.data || payload
const extractList = (payload) => {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.data)) return payload.data
  return []
}
const formatCurrency = (value) => Number(value || 0).toLocaleString('ar-EG')

const PROJECT_STATUS_OPTIONS = [
  { value: 'planning', label: 'قيد التخطيط' },
  { value: 'in_progress', label: 'قيد التنفيذ' },
  { value: 'completed', label: 'مكتمل' },
  { value: 'cancelled', label: 'ملغي' },
]

function ProjectDetail() {
  const { id } = useParams()
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')
  const [project, setProject] = useState(null)
  const [toast, setToast] = useState({ show: false, type: 'success', message: '' })
  const [isExporting, setIsExporting] = useState(false)

  const [materials, setMaterials] = useState([])
  const [laborTypes, setLaborTypes] = useState([])
  const [equipment, setEquipment] = useState([])

  const [quotationInputs, setQuotationInputs] = useState({
    overhead_pct: 10,
    contingency_pct: 5,
    profit_pct: 15,
  })
  const [latestQuotation, setLatestQuotation] = useState(null)

  const [isPhaseModalOpen, setIsPhaseModalOpen] = useState(false)
  const [newPhase, setNewPhase] = useState({ name: '', order_num: 1, status: 'planning' })
  const [deleteItem, setDeleteItem] = useState(null)

  const [activePhase, setActivePhase] = useState(null)
  const [resourceModal, setResourceModal] = useState('')
  const [materialForm, setMaterialForm] = useState({
    material_id: '',
    qty_estimated: '',
    unit_price: '',
  })
  const [laborForm, setLaborForm] = useState({
    labor_type_id: '',
    workers_count: '',
    days: '',
    rate: '',
  })
  const [equipmentForm, setEquipmentForm] = useState({
    equipment_id: '',
    qty_used: '',
    rate_per_unit: '',
  })

  const handleExportPDF = async () => {
    const printElement = document.getElementById('quotation-print-area')
    if (!printElement) return

    setIsExporting(true)
    try {
      printElement.style.display = 'block'

      const canvas = await html2canvas(printElement, {
        scale: 2,
        useCORS: true,
        logging: false
      })

      printElement.style.display = 'none'

      const imgData = canvas.toDataURL('image/png')

      const pdf = new jsPDF('p', 'mm', 'a4')
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
      pdf.save(`عرض-سعر-${project?.name || 'مشروع'}.pdf`)

      setToast({ show: true, type: 'success', message: 'تم تصدير عرض السعر بنجاح.' })
    } catch (err) {
      console.error(err)
      setToast({ show: true, type: 'error', message: 'حدث خطأ أثناء تصدير PDF.' })
      printElement.style.display = 'none'
    } finally {
      setIsExporting(false)
    }
  }

  const fetchDetails = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [projectRes, materialsRes, laborRes, equipmentRes] = await Promise.all([
        axios.get(`https://construction-erp-backend-production.up.railway.app/api/v1/projects/${id}`),
        getMaterials(),
        getLaborTypes(),
        getEquipment(),
      ])
      const projectData = extractData(projectRes.data)
      setProject(projectData)
      setLatestQuotation(projectData.latest_quotation || null)
      setMaterials(extractList(materialsRes.data))
      setLaborTypes(extractList(laborRes.data))
      setEquipment(extractList(equipmentRes.data))
    } catch (err) {
      console.log('Error:', err.response?.status, err.response?.data)
      setError('المشروع غير متاح')
      setToast({ show: true, type: 'error', message: 'تعذر تحميل بيانات المشروع.' })
    } finally {
      setLoading(false)
    }
  }, [id])

  const loadProject = async () => {
    try {
      const res = await axios.get(`https://construction-erp-backend-production.up.railway.app/api/v1/projects/${id}`)
      const projectData = extractData(res.data)
      setProject(projectData)
      setLatestQuotation(projectData.latest_quotation || null)
    } catch (err) {
      console.log('Error:', err.response?.status, err.response?.data)
      setError('المشروع غير متاح')
    }
  }

  useEffect(() => {
    fetchDetails()
  }, [fetchDetails])

  const onGenerateQuotation = async () => {
    setActionLoading(true)
    setError('')
    try {
      const res = await generateProjectQuotation(id, quotationInputs)

      // استخرج البيانات من الـ response مباشرة
      const quotationData = res?.data?.data || res?.data || res

      const materialsTotal = parseFloat(quotationData.materials_total || 0)
      const laborTotal = parseFloat(quotationData.labor_total || 0)
      const equipmentTotal = parseFloat(quotationData.equipment_total || 0)
      const baseTotal = materialsTotal + laborTotal + equipmentTotal

      const overheadValue = baseTotal * (parseFloat(quotationData.overhead_pct || 0) / 100)
      const contingencyValue = baseTotal * (parseFloat(quotationData.contingency_pct || 0) / 100)
      const profitValue = baseTotal * (parseFloat(quotationData.profit_pct || 0) / 100)

      setLatestQuotation({
        ...quotationData,
        overhead_value: overheadValue,
        contingency_value: contingencyValue,
        profit_value: profitValue,
      })

      setToast({ show: true, type: 'success', message: 'تم توليد عرض السعر بنجاح.' })
    } catch {
      setError('فشل توليد عرض السعر.')
      setToast({ show: true, type: 'error', message: 'فشل توليد عرض السعر.' })
    } finally {
      setActionLoading(false)
    }
  }

  const onCreatePhase = async (event) => {
    event.preventDefault()
    setActionLoading(true)
    try {
      await addProjectPhase(id, {
        name: newPhase.name.trim(),
        order_num: Number(newPhase.order_num),
        status: newPhase.status,
      })
      setIsPhaseModalOpen(false)
      setNewPhase({ name: '', order_num: 1, status: 'planning' })
      setToast({ show: true, type: 'success', message: 'تمت إضافة المرحلة بنجاح.' })
      await loadProject()
    } catch {
      setToast({ show: true, type: 'error', message: 'تعذر إضافة المرحلة.' })
    } finally {
      setActionLoading(false)
    }
  }

  const onStatusChange = async (status) => {
    setActionLoading(true)
    try {
      await patchProject(id, { status })
      setToast({ show: true, type: 'success', message: 'تم تحديث حالة المشروع.' })
      await loadProject()
    } catch {
      setToast({ show: true, type: 'error', message: 'تعذر تحديث حالة المشروع.' })
    } finally {
      setActionLoading(false)
    }
  }

  const onPhaseStatusChange = async (phaseId, status) => {
    setActionLoading(true)
    try {
      await patchPhase(phaseId, { status })
      setToast({ show: true, type: 'success', message: 'تم تحديث حالة المرحلة.' })
      await loadProject()
    } catch {
      setToast({ show: true, type: 'error', message: 'تعذر تحديث حالة المرحلة.' })
    } finally {
      setActionLoading(false)
    }
  }

  const openResourceModal = (phase, type) => {
    setActivePhase(phase)
    setResourceModal(type)
    if (type === 'material') {
      setMaterialForm({ material_id: '', qty_estimated: '', unit_price: '' })
    }
    if (type === 'labor') {
      setLaborForm({ labor_type_id: '', workers_count: '', days: '', rate: '' })
    }
    if (type === 'equipment') {
      setEquipmentForm({ equipment_id: '', qty_used: '', rate_per_unit: '' })
    }
  }

  const onAddMaterial = async (event) => {
    event.preventDefault()
    if (!activePhase) return
    setActionLoading(true)
    try {
      await addPhaseMaterial(activePhase.id, {
        material_id: Number(materialForm.material_id),
        qty_estimated: Number(materialForm.qty_estimated),
        unit_price: Number(materialForm.unit_price),
      })
      setResourceModal('')
      setToast({ show: true, type: 'success', message: 'تمت إضافة المادة للمرحلة.' })
      await loadProject()
    } catch {
      setToast({ show: true, type: 'error', message: 'تعذر إضافة المادة.' })
    } finally {
      setActionLoading(false)
    }
  }

  const onAddLabor = async (event) => {
    event.preventDefault()
    if (!activePhase) return
    setActionLoading(true)
    try {
      await addPhaseLabor(activePhase.id, {
        labor_type_id: Number(laborForm.labor_type_id),
        workers_count: Number(laborForm.workers_count),
        days: Number(laborForm.days),
      })
      setResourceModal('')
      setToast({ show: true, type: 'success', message: 'تمت إضافة العمالة للمرحلة.' })
      await loadProject()
    } catch {
      setToast({ show: true, type: 'error', message: 'تعذر إضافة العمالة.' })
    } finally {
      setActionLoading(false)
    }
  }

  const onAddEquipment = async (event) => {
    event.preventDefault()
    if (!activePhase) return
    setActionLoading(true)
    try {
      await addPhaseEquipment(activePhase.id, {
        equipment_id: Number(equipmentForm.equipment_id),
        qty_used: Number(equipmentForm.qty_used),
      })
      setResourceModal('')
      setToast({ show: true, type: 'success', message: 'تمت إضافة المعدة للمرحلة.' })
      await loadProject()
    } catch {
      setToast({ show: true, type: 'error', message: 'تعذر إضافة المعدة.' })
    } finally {
      setActionLoading(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteItem) return
    setActionLoading(true)
    try {
      if (deleteItem.type === 'phase') {
        await deleteProjectPhase(deleteItem.phaseId)
        setToast({ show: true, type: 'success', message: 'تم حذف المرحلة بنجاح' })
      } else if (deleteItem.type === 'material') {
        await deletePhaseMaterial(deleteItem.phaseId, deleteItem.itemId)
        setToast({ show: true, type: 'success', message: 'تم حذف المادة بنجاح' })
      } else if (deleteItem.type === 'labor') {
        await deletePhaseLabor(deleteItem.phaseId, deleteItem.itemId)
        setToast({ show: true, type: 'success', message: 'تم حذف العمالة بنجاح' })
      } else if (deleteItem.type === 'equipment') {
        await deletePhaseEquipment(deleteItem.phaseId, deleteItem.itemId)
        setToast({ show: true, type: 'success', message: 'تم حذف المعدة بنجاح' })
      }
      setDeleteItem(null)
      await loadProject()
    } catch {
      setToast({ show: true, type: 'error', message: 'تعذر الحذف' })
    } finally {
      setActionLoading(false)
    }
  }

  const laborPreviewTotal = useMemo(
    () => Number(laborForm.workers_count || 0) * Number(laborForm.days || 0) * Number(laborForm.rate || 0),
    [laborForm.days, laborForm.rate, laborForm.workers_count],
  )
  const equipmentPreviewTotal = useMemo(
    () => Number(equipmentForm.qty_used || 0) * Number(equipmentForm.rate_per_unit || 0),
    [equipmentForm.qty_used, equipmentForm.rate_per_unit],
  )

  const calculatePhaseTotal = (phase) => {
    const materialsTotal = (phase.materials || []).reduce((sum, m) => sum + (m.qty_estimated * m.unit_price), 0)
    const laborTotal = (phase.labor || phase.labor_items || []).reduce((sum, l) => sum + parseFloat(l.total_cost || 0), 0)
    const equipmentTotal = (phase.equipment || []).reduce((sum, e) => sum + parseFloat(e.total_cost || 0), 0)
    return materialsTotal + laborTotal + equipmentTotal
  }

  if (loading) return <LoadingSpinner />
  if (!project) return <div className="rounded-lg bg-red-100 p-4 text-red-700">المشروع غير متاح.</div>

  const phases = project.phases || []

  return (
    <div className="space-y-6">
      <Toast
        show={toast.show}
        type={toast.type}
        message={toast.message}
        onClose={() => setToast({ show: false, type: 'success', message: '' })}
      />
      <div className="rounded-xl bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-slate-900">{project.name}</h1>
            <p className="text-sm text-slate-500">
              العميل: {project.client?.name || '-'} | المساحة: {project.area_m2 || project.area || '-'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={project.status} />
            <select
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={project.status || 'planning'}
              onChange={(event) => onStatusChange(event.target.value)}
              disabled={actionLoading}
            >
              {PROJECT_STATUS_OPTIONS.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error && <div className="rounded-lg bg-red-100 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="rounded-xl bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-slate-800">مراحل المشروع</h2>
          <button
            type="button"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
            onClick={() => setIsPhaseModalOpen(true)}
          >
            إضافة مرحلة جديدة
          </button>
        </div>
        {phases.length === 0 && (
          <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">لا توجد مراحل مضافة لهذا المشروع</div>
        )}
        <div className="space-y-3">
          {phases.map((phase) => (
            <details key={phase.id} className="relative rounded-lg border border-slate-200 p-3" open>
              <button
                type="button"
                className="absolute left-3 top-3 text-red-500 hover:text-red-700"
                onClick={(e) => {
                  e.preventDefault()
                  setDeleteItem({ type: 'phase', phaseId: phase.id })
                }}
              >
                ×
              </button>
              <summary className="cursor-pointer font-semibold text-slate-800 flex items-center justify-between">
                <div>
                  {phase.name || `مرحلة ${phase.id}`} - <StatusBadge status={phase.status || 'planning'} />
                </div>
                <select
                  className="rounded border border-slate-200 px-2 py-1 text-xs ml-8 font-normal"
                  value={phase.status || 'planning'}
                  onChange={(e) => onPhaseStatusChange(phase.id, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                >
                  {PROJECT_STATUS_OPTIONS.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </summary>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700"
                  onClick={() => openResourceModal(phase, 'material')}
                >
                  إضافة مواد
                </button>
                <button
                  type="button"
                  className="rounded bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700"
                  onClick={() => openResourceModal(phase, 'labor')}
                >
                  إضافة عمالة
                </button>
                <button
                  type="button"
                  className="rounded bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700"
                  onClick={() => openResourceModal(phase, 'equipment')}
                >
                  إضافة معدات
                </button>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <div>
                  <h3 className="mb-2 text-sm font-bold text-slate-700">المواد</h3>
                  <div className="overflow-x-auto rounded-lg border border-slate-200">
                    <table className="min-w-full text-right text-xs">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-2 py-2">المادة</th>
                          <th className="px-2 py-2">الوحدة</th>
                          <th className="px-2 py-2">الكمية</th>
                          <th className="px-2 py-2">سعر الوحدة</th>
                          <th className="px-2 py-2">الإجمالي</th>
                          <th className="px-2 py-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {(phase.materials || []).map((item) => (
                          <tr key={item.id} className="border-t border-slate-100">
                            <td className="px-2 py-2">{item.material?.name}</td>
                            <td className="px-2 py-2">{item.material?.unit}</td>
                            <td className="px-2 py-2">{item.qty_estimated}</td>
                            <td className="px-2 py-2">{item.unit_price}</td>
                            <td className="px-2 py-2">{item.qty_estimated * item.unit_price}</td>
                            <td className="px-2 py-2">
                              <button
                                type="button"
                                className="text-red-500 hover:text-red-700"
                                onClick={() => setDeleteItem({ type: 'material', phaseId: phase.id, itemId: item.id })}
                              >
                                ×
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-bold text-slate-700">العمالة</h3>
                  <div className="overflow-x-auto rounded-lg border border-slate-200">
                    <table className="min-w-full text-right text-xs">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-2 py-2">النوع</th>
                          <th className="px-2 py-2">العمال</th>
                          <th className="px-2 py-2">الأيام</th>
                          <th className="px-2 py-2">المعدل</th>
                          <th className="px-2 py-2">الإجمالي</th>
                          <th className="px-2 py-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {(phase.labor || phase.labor_items || []).map((item) => (
                          <tr key={item.id} className="border-t border-slate-100">
                            <td className="px-2 py-2">{item.labor_type?.title}</td>
                            <td className="px-2 py-2">{item.workers_count}</td>
                            <td className="px-2 py-2">{item.days}</td>
                            <td className="px-2 py-2">{item.labor_type?.rate}</td>
                            <td className="px-2 py-2">{item.total_cost}</td>
                            <td className="px-2 py-2">
                              <button
                                type="button"
                                className="text-red-500 hover:text-red-700"
                                onClick={() => setDeleteItem({ type: 'labor', phaseId: phase.id, itemId: item.id })}
                              >
                                ×
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-bold text-slate-700">المعدات</h3>
                  <div className="overflow-x-auto rounded-lg border border-slate-200">
                    <table className="min-w-full text-right text-xs">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-2 py-2">المعدة</th>
                          <th className="px-2 py-2">الوحدة</th>
                          <th className="px-2 py-2">الكمية</th>
                          <th className="px-2 py-2">المعدل</th>
                          <th className="px-2 py-2">الإجمالي</th>
                          <th className="px-2 py-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {(phase.equipment || []).map((item) => (
                          <tr key={item.id} className="border-t border-slate-100">
                            <td className="px-2 py-2">{item.equipment?.name}</td>
                            <td className="px-2 py-2">{item.equipment?.unit}</td>
                            <td className="px-2 py-2">{item.qty_used}</td>
                            <td className="px-2 py-2">{item.equipment?.rate_per_unit}</td>
                            <td className="px-2 py-2">{item.total_cost}</td>
                            <td className="px-2 py-2">
                              <button
                                type="button"
                                className="text-red-500 hover:text-red-700"
                                onClick={() => setDeleteItem({ type: 'equipment', phaseId: phase.id, itemId: item.id })}
                              >
                                ×
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
                إجمالي المرحلة: {formatCurrency(calculatePhaseTotal(phase))} د
              </div>
            </details>
          ))}
        </div>
      </div>

      <div className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-slate-800">توليد عرض سعر</h2>
        <div className="grid gap-3 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">نسبة المصاريف العامة %</label>
            <input
              type="number"
              className="w-full rounded-lg border border-slate-200 px-3 py-2"
              value={quotationInputs.overhead_pct}
              onChange={(e) =>
                setQuotationInputs((prev) => ({ ...prev, overhead_pct: Number(e.target.value) }))
              }
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">نسبة الطوارئ %</label>
            <input
              type="number"
              className="w-full rounded-lg border border-slate-200 px-3 py-2"
              value={quotationInputs.contingency_pct}
              onChange={(e) =>
                setQuotationInputs((prev) => ({ ...prev, contingency_pct: Number(e.target.value) }))
              }
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">نسبة الأرباح %</label>
            <input
              type="number"
              className="w-full rounded-lg border border-slate-200 px-3 py-2"
              value={quotationInputs.profit_pct}
              onChange={(e) =>
                setQuotationInputs((prev) => ({ ...prev, profit_pct: Number(e.target.value) }))
              }
            />
          </div>
          <button
            type="button"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
            onClick={onGenerateQuotation}
            disabled={actionLoading}
          >
            {actionLoading ? 'جاري التوليد...' : 'توليد عرض السعر'}
          </button>
        </div>
      </div>

      {latestQuotation && (
        <div className="rounded-xl bg-white p-5 shadow-sm border border-slate-200">
          <h2 className="mb-4 text-lg font-bold text-slate-800 border-b border-slate-200 pb-2">عرض السعر</h2>
          <table className="w-full text-right text-sm">
            <tbody>
              <tr className="border-b border-slate-100">
                <td className="py-2 text-slate-600">مجموع المواد</td>
                <td className="py-2 font-medium">{formatCurrency(latestQuotation.materials_total || latestQuotation.materials_sum)} د</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-2 text-slate-600">مجموع العمالة</td>
                <td className="py-2 font-medium">{formatCurrency(latestQuotation.labor_total || latestQuotation.labor_sum)} د</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-2 text-slate-600">مجموع المعدات</td>
                <td className="py-2 font-medium">{formatCurrency(latestQuotation.equipment_total || latestQuotation.equipment_sum)} د</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-2 text-slate-600">المصاريف العامة</td>
                <td className="py-2 font-medium">{formatCurrency(latestQuotation.overhead_value || latestQuotation.overhead)} د</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-2 text-slate-600">الطوارئ</td>
                <td className="py-2 font-medium">{formatCurrency(latestQuotation.contingency_value || latestQuotation.contingency)} د</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="py-2 text-slate-600">الأرباح</td>
                <td className="py-2 font-medium">{formatCurrency(latestQuotation.profit_value || latestQuotation.profit)} د</td>
              </tr>
              <tr>
                <td className="py-3 font-bold text-slate-900">الإجمالي النهائي</td>
                <td className="py-3 font-bold text-emerald-700 text-lg">{formatCurrency(latestQuotation.grand_total || latestQuotation.total || 0)} د</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {latestQuotation && (
        <div className="flex justify-end mb-4">
          <button
            type="button"
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
            onClick={handleExportPDF}
            disabled={isExporting}
          >
            {isExporting ? (
              <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
              </svg>
            )}
            {isExporting ? 'جاري التصدير...' : 'تصدير PDF'}
          </button>
        </div>
      )}

      <Modal isOpen={isPhaseModalOpen} title="إضافة مرحلة جديدة" onClose={() => setIsPhaseModalOpen(false)}>
        <form className="grid gap-3" onSubmit={onCreatePhase}>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">اسم المرحلة *</label>
            <input
              type="text"
              className="w-full rounded-lg border border-slate-200 px-3 py-2"
              placeholder="اسم المرحلة"
              value={newPhase.name}
              onChange={(event) => setNewPhase((prev) => ({ ...prev, name: event.target.value }))}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">الترتيب</label>
            <input
              type="number"
              className="w-full rounded-lg border border-slate-200 px-3 py-2"
              placeholder="ترتيب المرحلة"
              value={newPhase.order_num}
              onChange={(event) => setNewPhase((prev) => ({ ...prev, order_num: event.target.value }))}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">الحالة</label>
            <select
              className="w-full rounded-lg border border-slate-200 px-3 py-2"
              value={newPhase.status}
              onChange={(event) => setNewPhase((prev) => ({ ...prev, status: event.target.value }))}
            >
              {PROJECT_STATUS_OPTIONS.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
            حفظ
          </button>
        </form>
      </Modal>

      <Modal isOpen={resourceModal === 'material'} title="إضافة مواد" onClose={() => setResourceModal('')}>
        <form className="grid gap-3" onSubmit={onAddMaterial}>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">المادة *</label>
            <select
              className="w-full rounded-lg border border-slate-200 px-3 py-2"
              value={materialForm.material_id}
              onChange={(event) => {
                const selected = materials.find((item) => item.id === Number(event.target.value))
                setMaterialForm((prev) => ({
                  ...prev,
                  material_id: event.target.value,
                  unit_price: selected?.unit_price ? String(selected.unit_price) : prev.unit_price,
                }))
              }}
              required
            >
              <option value="">اختر المادة</option>
              {materials.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">الكمية المقدرة *</label>
            <input
              type="number"
              className="w-full rounded-lg border border-slate-200 px-3 py-2"
              placeholder="الكمية التقديرية"
              value={materialForm.qty_estimated}
              onChange={(event) => setMaterialForm((prev) => ({ ...prev, qty_estimated: event.target.value }))}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">سعر الوحدة *</label>
            <input
              type="number"
              className="w-full rounded-lg border border-slate-200 px-3 py-2"
              placeholder="سعر الوحدة"
              value={materialForm.unit_price}
              onChange={(event) => setMaterialForm((prev) => ({ ...prev, unit_price: event.target.value }))}
              required
            />
          </div>
          <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
            الإجمالي: {formatCurrency(Number(materialForm.qty_estimated || 0) * Number(materialForm.unit_price || 0))} د
          </div>
          <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
            حفظ
          </button>
        </form>
      </Modal>

      <Modal isOpen={resourceModal === 'labor'} title="إضافة عمالة" onClose={() => setResourceModal('')}>
        <form className="grid gap-3" onSubmit={onAddLabor}>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">نوع العامل *</label>
            <select
              className="w-full rounded-lg border border-slate-200 px-3 py-2"
              value={laborForm.labor_type_id}
              onChange={(event) => {
                const selected = laborTypes.find((item) => item.id === Number(event.target.value))
                setLaborForm((prev) => ({
                  ...prev,
                  labor_type_id: event.target.value,
                  rate: selected?.rate ? String(selected.rate) : prev.rate,
                }))
              }}
              required
            >
              <option value="">اختر نوع العمالة</option>
              {laborTypes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">عدد العمال *</label>
            <input
              type="number"
              className="w-full rounded-lg border border-slate-200 px-3 py-2"
              placeholder="عدد العمال"
              value={laborForm.workers_count}
              onChange={(event) => setLaborForm((prev) => ({ ...prev, workers_count: event.target.value }))}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">عدد الأيام *</label>
            <input
              type="number"
              className="w-full rounded-lg border border-slate-200 px-3 py-2"
              placeholder="عدد الأيام"
              value={laborForm.days}
              onChange={(event) => setLaborForm((prev) => ({ ...prev, days: event.target.value }))}
              required
            />
          </div>
          <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
            التكلفة المتوقعة: {formatCurrency(laborPreviewTotal)} د
          </div>
          <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
            حفظ
          </button>
        </form>
      </Modal>

      <Modal isOpen={resourceModal === 'equipment'} title="إضافة معدات" onClose={() => setResourceModal('')}>
        <form className="grid gap-3" onSubmit={onAddEquipment}>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">المعدة *</label>
            <select
              className="w-full rounded-lg border border-slate-200 px-3 py-2"
              value={equipmentForm.equipment_id}
              onChange={(event) => {
                const selected = equipment.find((item) => item.id === Number(event.target.value))
                setEquipmentForm((prev) => ({
                  ...prev,
                  equipment_id: event.target.value,
                  rate_per_unit: selected?.rate_per_unit ? String(selected.rate_per_unit) : prev.rate_per_unit,
                }))
              }}
              required
            >
              <option value="">اختر المعدة</option>
              {equipment.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">الكمية المستخدمة *</label>
            <input
              type="number"
              className="w-full rounded-lg border border-slate-200 px-3 py-2"
              placeholder="الكمية المستخدمة"
              value={equipmentForm.qty_used}
              onChange={(event) => setEquipmentForm((prev) => ({ ...prev, qty_used: event.target.value }))}
              required
            />
          </div>
          <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
            التكلفة المتوقعة: {formatCurrency(equipmentPreviewTotal)} د
          </div>
          <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
            حفظ
          </button>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteItem}
        onCancel={() => setDeleteItem(null)}
        onConfirm={confirmDelete}
      />

      {/* Hidden Printable Area */}
      {latestQuotation && (
        <div id="quotation-print-area" style={{ display: 'none', width: '800px', padding: '40px', backgroundColor: '#fff', color: '#000', direction: 'rtl' }}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>Construction ERP</h1>
            <h2 style={{ fontSize: '20px', margin: '10px 0' }}>عرض سعر</h2>
            <p style={{ margin: 0 }}>التاريخ: {new Intl.DateTimeFormat('ar-EG').format(new Date())}</p>
          </div>

          <div style={{ marginBottom: '30px' }}>
            <p style={{ margin: '0 0 5px 0' }}><strong>المشروع:</strong> {project.name}</p>
            <p style={{ margin: '0 0 5px 0' }}><strong>العميل:</strong> {project.client?.name || '-'}</p>
            <p style={{ margin: 0 }}><strong>المساحة:</strong> {project.area_m2 || project.area || '-'} م²</p>
          </div>

          <h3 style={{ fontSize: '18px', fontWeight: 'bold', borderBottom: '1px solid #ccc', paddingBottom: '10px', marginBottom: '15px' }}>تفاصيل التكلفة</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px', fontSize: '14px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f3f4f6' }}>
                <th style={{ border: '1px solid #e5e7eb', padding: '10px', textAlign: 'right' }}>البيان</th>
                <th style={{ border: '1px solid #e5e7eb', padding: '10px', textAlign: 'right' }}>المبلغ</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ border: '1px solid #e5e7eb', padding: '10px' }}>مجموع المواد</td>
                <td style={{ border: '1px solid #e5e7eb', padding: '10px' }}>{formatCurrency(latestQuotation.materials_total || latestQuotation.materials_sum)} د</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #e5e7eb', padding: '10px' }}>مجموع العمالة</td>
                <td style={{ border: '1px solid #e5e7eb', padding: '10px' }}>{formatCurrency(latestQuotation.labor_total || latestQuotation.labor_sum)} د</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #e5e7eb', padding: '10px' }}>مجموع المعدات</td>
                <td style={{ border: '1px solid #e5e7eb', padding: '10px' }}>{formatCurrency(latestQuotation.equipment_total || latestQuotation.equipment_sum)} د</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #e5e7eb', padding: '10px' }}>المصاريف العامة ({quotationInputs.overhead_pct}%)</td>
                <td style={{ border: '1px solid #e5e7eb', padding: '10px' }}>{formatCurrency(latestQuotation.overhead_value || latestQuotation.overhead)} د</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #e5e7eb', padding: '10px' }}>الطوارئ ({quotationInputs.contingency_pct}%)</td>
                <td style={{ border: '1px solid #e5e7eb', padding: '10px' }}>{formatCurrency(latestQuotation.contingency_value || latestQuotation.contingency)} د</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #e5e7eb', padding: '10px' }}>الأرباح ({quotationInputs.profit_pct}%)</td>
                <td style={{ border: '1px solid #e5e7eb', padding: '10px' }}>{formatCurrency(latestQuotation.profit_value || latestQuotation.profit)} د</td>
              </tr>
              <tr style={{ backgroundColor: '#f3f4f6', fontWeight: 'bold' }}>
                <td style={{ border: '1px solid #e5e7eb', padding: '10px' }}>الإجمالي النهائي</td>
                <td style={{ border: '1px solid #e5e7eb', padding: '10px', color: '#047857' }}>{formatCurrency(latestQuotation.grand_total || latestQuotation.total || 0)} د</td>
              </tr>
            </tbody>
          </table>

          <h3 style={{ fontSize: '18px', fontWeight: 'bold', borderBottom: '1px solid #ccc', paddingBottom: '10px', marginBottom: '15px' }}>ملخص المراحل</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '40px', fontSize: '14px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f3f4f6' }}>
                <th style={{ border: '1px solid #e5e7eb', padding: '10px', textAlign: 'right' }}>المرحلة</th>
                <th style={{ border: '1px solid #e5e7eb', padding: '10px', textAlign: 'right' }}>الحالة</th>
                <th style={{ border: '1px solid #e5e7eb', padding: '10px', textAlign: 'right' }}>التكلفة</th>
              </tr>
            </thead>
            <tbody>
              {phases.map(phase => {
                const statusLabel = PROJECT_STATUS_OPTIONS.find(opt => opt.value === phase.status)?.label || phase.status;
                return (
                  <tr key={phase.id}>
                    <td style={{ border: '1px solid #e5e7eb', padding: '10px' }}>{phase.name || `مرحلة ${phase.id}`}</td>
                    <td style={{ border: '1px solid #e5e7eb', padding: '10px' }}>{statusLabel}</td>
                    <td style={{ border: '1px solid #e5e7eb', padding: '10px' }}>{formatCurrency(calculatePhaseTotal(phase))} د</td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          <div style={{ marginTop: '50px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <p style={{ fontWeight: 'bold', margin: 0 }}>هذا العرض صالح لمدة 30 يوماً</p>
            </div>
            <div style={{ textAlign: 'center', width: '200px' }}>
              <p style={{ margin: '0 0 40px 0', fontWeight: 'bold' }}>التوقيع</p>
              <div style={{ borderBottom: '1px solid #000' }}></div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProjectDetail
