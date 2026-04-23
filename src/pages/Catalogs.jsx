import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  createEquipment,
  createLaborType,
  createMaterial,
  deleteEquipment,
  deleteLaborType,
  deleteMaterial,
  getEquipment,
  getLaborTypes,
  getMaterials,
  updateEquipment,
  updateLaborType,
  updateMaterial,
} from '../api/catalogs'
import LoadingSpinner from '../components/LoadingSpinner'
import Modal from '../components/Modal'
import Toast from '../components/Toast'
import ConfirmDialog from '../components/ConfirmDialog'

const MATERIAL_UNITS = [
  { value: 'm2', label: 'متر مربع' },
  { value: 'm3', label: 'متر مكعب' },
  { value: 'ton', label: 'طن' },
  { value: 'piece', label: 'قطعة' },
  { value: 'liter', label: 'لتر' },
  { value: 'kg', label: 'كيلوغرام' },
  { value: 'meter', label: 'متر' },
]

const MATERIAL_CATEGORIES = [
  { value: 'concrete', label: 'خرسانة' },
  { value: 'steel', label: 'حديد' },
  { value: 'block', label: 'بلوك وبناء' },
  { value: 'paint', label: 'دهانات' },
  { value: 'tile', label: 'بلاط وسيراميك' },
  { value: 'insulation', label: 'عزل' },
  { value: 'other', label: 'أخرى' },
]

const LABOR_PAY_TYPES = [
  { value: 'daily', label: 'يومي' },
  { value: 'monthly', label: 'شهري' },
  { value: 'fixed', label: 'مقطوع' },
]

const EQUIPMENT_UNITS = [
  { value: 'hour', label: 'ساعة' },
  { value: 'day', label: 'يوم' },
  { value: 'trip', label: 'رحلة' },
]

const TAB_CONFIG = {
  materials: {
    label: 'مواد',
    getter: getMaterials,
    create: createMaterial,
    update: updateMaterial,
    remove: deleteMaterial,
  },
  labor: {
    label: 'أنواع العمالة',
    getter: getLaborTypes,
    create: createLaborType,
    update: updateLaborType,
    remove: deleteLaborType,
  },
  equipment: {
    label: 'معدات',
    getter: getEquipment,
    create: createEquipment,
    update: updateEquipment,
    remove: deleteEquipment,
  },
}

const EMPTY_FORMS = {
  materials: {
    name: '',
    unit: '',
    unit_price: '',
    category: '',
    description: '',
  },
  labor: {
    title: '',
    pay_type: '',
    rate: '',
  },
  equipment: {
    name: '',
    unit: '',
    rate_per_unit: '',
    description: '',
  },
}

const extractList = (payload) => {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.data)) return payload.data
  return []
}

const mapApiValidationErrors = (apiError) => {
  const errors = apiError?.response?.data?.errors
  if (!errors || typeof errors !== 'object') return []
  return Object.values(errors)
    .flat()
    .map((message) => String(message))
}

const getLabelByValue = (list, value) => list.find((item) => item.value === value)?.label || value || '-'

function Catalogs() {
  const [activeTab, setActiveTab] = useState('materials')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [validationErrors, setValidationErrors] = useState([])
  const [catalogs, setCatalogs] = useState({
    materials: [],
    labor: [],
    equipment: [],
  })
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [formByTab, setFormByTab] = useState(EMPTY_FORMS)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [toast, setToast] = useState({ show: false, type: 'success', message: '' })

  const loadCatalogs = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [materialsRes, laborRes, equipmentRes] = await Promise.all([
        getMaterials(),
        getLaborTypes(),
        getEquipment(),
      ])
      setCatalogs({
        materials: extractList(materialsRes.data),
        labor: extractList(laborRes.data),
        equipment: extractList(equipmentRes.data),
      })
    } catch {
      setError('تعذر تحميل بيانات الكتالوجات. حاول مرة أخرى.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCatalogs()
  }, [loadCatalogs])

  const currentItems = useMemo(() => {
    const list = catalogs[activeTab] || []
    const query = search.trim().toLowerCase()
    if (!query) return list

    return list.filter((item) => {
      if (activeTab === 'labor') {
        const haystack = `${item.title || ''} ${item.pay_type || ''} ${item.rate || ''}`.toLowerCase()
        return haystack.includes(query)
      }
      if (activeTab === 'equipment') {
        const haystack = `${item.name || ''} ${item.unit || ''} ${item.rate_per_unit || ''} ${item.description || ''}`.toLowerCase()
        return haystack.includes(query)
      }
      const haystack =
        `${item.name || ''} ${item.unit || ''} ${item.category || ''} ${item.unit_price || ''} ${item.description || ''}`.toLowerCase()
      return haystack.includes(query)
    })
  }, [activeTab, catalogs, search])

  const currentForm = formByTab[activeTab]

  const openAddModal = () => {
    setEditingItem(null)
    setValidationErrors([])
    setError('')
    setSuccess('')
    setFormByTab((prev) => ({
      ...prev,
      [activeTab]: { ...EMPTY_FORMS[activeTab] },
    }))
    setIsModalOpen(true)
  }

  const openEditModal = (item) => {
    setEditingItem(item)
    setValidationErrors([])
    setError('')
    setSuccess('')

    if (activeTab === 'labor') {
      setFormByTab((prev) => ({
        ...prev,
        labor: {
          title: item.title || '',
          pay_type: item.pay_type || '',
          rate: String(item.rate ?? ''),
        },
      }))
    } else if (activeTab === 'equipment') {
      setFormByTab((prev) => ({
        ...prev,
        equipment: {
          name: item.name || '',
          unit: item.unit || '',
          rate_per_unit: String(item.rate_per_unit ?? ''),
          description: item.description || '',
        },
      }))
    } else {
      setFormByTab((prev) => ({
        ...prev,
        materials: {
          name: item.name || '',
          unit: item.unit || '',
          unit_price: String(item.unit_price ?? ''),
          category: item.category || '',
          description: item.description || '',
        },
      }))
    }

    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingItem(null)
    setValidationErrors([])
  }

  const setCurrentField = (field, value) => {
    setFormByTab((prev) => ({
      ...prev,
      [activeTab]: {
        ...prev[activeTab],
        [field]: value,
      },
    }))
  }

  const buildPayload = () => {
    if (activeTab === 'materials') {
      return {
        name: currentForm.name.trim(),
        unit: currentForm.unit,
        unit_price: Number(currentForm.unit_price),
        category: currentForm.category,
        description: currentForm.description.trim() || null,
      }
    }
    if (activeTab === 'labor') {
      return {
        title: currentForm.title.trim(),
        pay_type: currentForm.pay_type,
        rate: Number(currentForm.rate),
      }
    }
    return {
      name: currentForm.name.trim(),
      unit: currentForm.unit,
      rate_per_unit: Number(currentForm.rate_per_unit),
      description: currentForm.description.trim() || null,
    }
  }

  const onSave = async (event) => {
    event.preventDefault()
    setIsSubmitting(true)
    setError('')
    setSuccess('')
    setValidationErrors([])

    const payload = buildPayload()
    const config = TAB_CONFIG[activeTab]

    try {
      if (editingItem?.id) {
        await config.update(editingItem.id, payload)
        setSuccess('تم تحديث العنصر بنجاح.')
        setToast({ show: true, type: 'success', message: 'تم تحديث العنصر بنجاح.' })
      } else {
        await config.create(payload)
        setSuccess('تمت إضافة العنصر بنجاح.')
        setToast({ show: true, type: 'success', message: 'تمت إضافة العنصر بنجاح.' })
      }
      setFormByTab((prev) => ({
        ...prev,
        [activeTab]: { ...EMPTY_FORMS[activeTab] },
      }))
      setIsModalOpen(false)
      setEditingItem(null)
      await loadCatalogs()
    } catch (apiError) {
      if (apiError?.response?.status === 422) {
        const fieldErrors = mapApiValidationErrors(apiError)
        setValidationErrors(fieldErrors.length ? fieldErrors : ['تحقق من الحقول المطلوبة.'])
      } else {
        setError('تعذر حفظ العنصر. حاول مرة أخرى.')
        setToast({ show: true, type: 'error', message: 'تعذر حفظ العنصر.' })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const onDelete = async () => {
    if (!confirmDeleteId) return
    setError('')
    setSuccess('')
    setValidationErrors([])
    try {
      await TAB_CONFIG[activeTab].remove(confirmDeleteId)
      setSuccess('تم حذف العنصر بنجاح.')
      setToast({ show: true, type: 'success', message: 'تم حذف العنصر بنجاح.' })
      setConfirmDeleteId(null)
      await loadCatalogs()
    } catch {
      setError('تعذر حذف العنصر. حاول لاحقًا.')
      setToast({ show: true, type: 'error', message: 'تعذر حذف العنصر.' })
    }
  }

  const renderTable = () => {
    if (activeTab === 'labor') {
      return (
        <table className="min-w-full text-right text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 font-semibold">المسمى الوظيفي</th>
              <th className="px-4 py-3 font-semibold">نوع الأجر</th>
              <th className="px-4 py-3 font-semibold">القيمة</th>
              <th className="px-4 py-3 font-semibold">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {currentItems.map((item, index) => (
              <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                <td className="px-4 py-3 font-medium text-slate-800">{item.title || '-'}</td>
                <td className="px-4 py-3 text-slate-600">{getLabelByValue(LABOR_PAY_TYPES, item.pay_type)}</td>
                <td className="px-4 py-3 text-slate-600">{item.rate ?? '-'}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button type="button" className="rounded-md bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700" onClick={() => openEditModal(item)}>تعديل</button>
                    <button type="button" className="rounded-md bg-red-100 px-3 py-1 text-xs font-semibold text-red-700" onClick={() => setConfirmDeleteId(item.id)}>حذف</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )
    }

    if (activeTab === 'equipment') {
      return (
        <table className="min-w-full text-right text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 font-semibold">الاسم</th>
              <th className="px-4 py-3 font-semibold">الوحدة</th>
              <th className="px-4 py-3 font-semibold">السعر للوحدة</th>
              <th className="px-4 py-3 font-semibold">الوصف</th>
              <th className="px-4 py-3 font-semibold">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {currentItems.map((item, index) => (
              <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                <td className="px-4 py-3 font-medium text-slate-800">{item.name || '-'}</td>
                <td className="px-4 py-3 text-slate-600">{getLabelByValue(EQUIPMENT_UNITS, item.unit)}</td>
                <td className="px-4 py-3 text-slate-600">{item.rate_per_unit ?? '-'}</td>
                <td className="px-4 py-3 text-slate-600">{item.description || '-'}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button type="button" className="rounded-md bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700" onClick={() => openEditModal(item)}>تعديل</button>
                    <button type="button" className="rounded-md bg-red-100 px-3 py-1 text-xs font-semibold text-red-700" onClick={() => setConfirmDeleteId(item.id)}>حذف</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )
    }

    return (
      <table className="min-w-full text-right text-sm">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            <th className="px-4 py-3 font-semibold">الاسم</th>
            <th className="px-4 py-3 font-semibold">الفئة</th>
            <th className="px-4 py-3 font-semibold">الوحدة</th>
            <th className="px-4 py-3 font-semibold">سعر الوحدة</th>
            <th className="px-4 py-3 font-semibold">الوصف</th>
            <th className="px-4 py-3 font-semibold">إجراءات</th>
          </tr>
        </thead>
        <tbody>
          {currentItems.map((item, index) => (
            <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
              <td className="px-4 py-3 font-medium text-slate-800">{item.name || '-'}</td>
              <td className="px-4 py-3 text-slate-600">{getLabelByValue(MATERIAL_CATEGORIES, item.category)}</td>
              <td className="px-4 py-3 text-slate-600">{getLabelByValue(MATERIAL_UNITS, item.unit)}</td>
              <td className="px-4 py-3 text-slate-600">{item.unit_price ?? '-'}</td>
              <td className="px-4 py-3 text-slate-600">{item.description || '-'}</td>
              <td className="px-4 py-3">
                <div className="flex gap-2">
                  <button type="button" className="rounded-md bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700" onClick={() => openEditModal(item)}>تعديل</button>
                  <button type="button" className="rounded-md bg-red-100 px-3 py-1 text-xs font-semibold text-red-700" onClick={() => setConfirmDeleteId(item.id)}>حذف</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  const renderModalForm = () => {
    if (activeTab === 'labor') {
      return (
        <>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">المسمى الوظيفي</label>
            <input
              type="text"
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={currentForm.title}
              onChange={(event) => setCurrentField('title', event.target.value)}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">نوع الأجر</label>
            <select
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={currentForm.pay_type}
              onChange={(event) => setCurrentField('pay_type', event.target.value)}
              required
            >
              <option value="">اختر النوع</option>
              {LABOR_PAY_TYPES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">قيمة الأجر</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={currentForm.rate}
              onChange={(event) => setCurrentField('rate', event.target.value)}
              required
            />
          </div>
        </>
      )
    }

    if (activeTab === 'equipment') {
      return (
        <>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">اسم المعدة</label>
            <input
              type="text"
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={currentForm.name}
              onChange={(event) => setCurrentField('name', event.target.value)}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">الوحدة</label>
            <select
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={currentForm.unit}
              onChange={(event) => setCurrentField('unit', event.target.value)}
              required
            >
              <option value="">اختر الوحدة</option>
              {EQUIPMENT_UNITS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">السعر لكل وحدة</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={currentForm.rate_per_unit}
              onChange={(event) => setCurrentField('rate_per_unit', event.target.value)}
              required
            />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-semibold text-slate-700">الوصف (اختياري)</label>
            <textarea
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              rows={3}
              value={currentForm.description}
              onChange={(event) => setCurrentField('description', event.target.value)}
            />
          </div>
        </>
      )
    }

    return (
      <>
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">اسم المادة</label>
          <input
            type="text"
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            value={currentForm.name}
            onChange={(event) => setCurrentField('name', event.target.value)}
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">الوحدة</label>
          <select
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            value={currentForm.unit}
            onChange={(event) => setCurrentField('unit', event.target.value)}
            required
          >
            <option value="">اختر الوحدة</option>
            {MATERIAL_UNITS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">الفئة</label>
          <select
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            value={currentForm.category}
            onChange={(event) => setCurrentField('category', event.target.value)}
            required
          >
            <option value="">اختر الفئة</option>
            {MATERIAL_CATEGORIES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">سعر الوحدة</label>
          <input
            type="number"
            min="0"
            step="0.01"
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            value={currentForm.unit_price}
            onChange={(event) => setCurrentField('unit_price', event.target.value)}
            required
          />
        </div>
        <div className="md:col-span-2">
          <label className="mb-1 block text-sm font-semibold text-slate-700">الوصف (اختياري)</label>
          <textarea
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            rows={3}
            value={currentForm.description}
            onChange={(event) => setCurrentField('description', event.target.value)}
          />
        </div>
      </>
    )
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <Toast
        show={toast.show}
        type={toast.type}
        message={toast.message}
        onClose={() => setToast({ show: false, type: 'success', message: '' })}
      />
      <header className="rounded-2xl bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-black text-slate-900">إدارة الكتالوجات</h1>
        <p className="mt-1 text-sm text-slate-500">مواد البناء، أنواع العمالة، والمعدات التشغيلية</p>
      </header>

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          {Object.entries(TAB_CONFIG).map(([key, config]) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                activeTab === key
                  ? 'bg-blue-600 text-white shadow'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {config.label}
            </button>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <input
            type="text"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 md:max-w-sm"
            placeholder="بحث مباشر داخل الجدول"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-600">
              عدد العناصر: {currentItems.length}
            </span>
            <button
              type="button"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
              onClick={openAddModal}
            >
              إضافة جديد
            </button>
          </div>
        </div>

        {success && <div className="mt-4 rounded-lg bg-emerald-100 px-4 py-3 text-sm text-emerald-700">{success}</div>}
        {error && <div className="mt-4 rounded-lg bg-red-100 px-4 py-3 text-sm text-red-700">{error}</div>}

        <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200">
          {renderTable()}
          {currentItems.length === 0 && (
            <div className="p-6 text-center text-sm text-slate-500">لا توجد عناصر مطابقة لبحثك.</div>
          )}
        </div>
      </section>

      <Modal
        isOpen={isModalOpen}
        title={`${editingItem ? 'تعديل' : 'إضافة'} ${TAB_CONFIG[activeTab].label}`}
        onClose={closeModal}
      >
        <form className="grid gap-4 md:grid-cols-2" onSubmit={onSave}>
          {validationErrors.length > 0 && (
            <div className="md:col-span-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              <p className="mb-1 font-semibold">يرجى تصحيح الأخطاء التالية:</p>
              <ul className="list-inside list-disc space-y-1">
                {validationErrors.map((message, index) => (
                  <li key={`${message}-${index}`}>{message}</li>
                ))}
              </ul>
            </div>
          )}

          {renderModalForm()}

          <div className="md:col-span-2 flex justify-end gap-2 pt-1">
            <button
              type="button"
              className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
              onClick={closeModal}
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-70"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'جاري الحفظ...' : 'حفظ'}
            </button>
          </div>
        </form>
      </Modal>
      <ConfirmDialog isOpen={Boolean(confirmDeleteId)} onCancel={() => setConfirmDeleteId(null)} onConfirm={onDelete} />
    </div>
  )
}

export default Catalogs
