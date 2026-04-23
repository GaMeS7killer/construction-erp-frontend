import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getProjectSummary } from '../api/projects'
import LoadingSpinner from '../components/LoadingSpinner'
import StatusBadge from '../components/StatusBadge'

const extractData = (payload) => payload?.data || payload

function Quotation() {
  const { id } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [projectSummary, setProjectSummary] = useState(null)

  useEffect(() => {
    const loadQuotation = async () => {
      setLoading(true)
      setError('')
      try {
        const response = await getProjectSummary(id)
        setProjectSummary(extractData(response.data))
      } catch {
        setError('تعذر تحميل بيانات عرض السعر.')
      } finally {
        setLoading(false)
      }
    }

    loadQuotation()
  }, [id])

  if (loading) return <LoadingSpinner />
  if (error) return <div className="rounded-lg bg-red-100 p-4 text-red-700">{error}</div>

  const project = projectSummary?.project || projectSummary
  const quotation = projectSummary?.latest_quotation

  if (!quotation) {
    return <div className="rounded-lg bg-amber-100 p-4 text-amber-700">لا يوجد عرض سعر لهذا المشروع بعد.</div>
  }

  return (
    <div className="space-y-6 rounded-xl bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">عرض سعر مشروع</h1>
          <p className="text-sm text-slate-500">المشروع: {project?.name || '-'}</p>
          <p className="text-sm text-slate-500">العميل: {project?.client?.name || '-'}</p>
        </div>
        <StatusBadge status={quotation.status} />
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-right text-sm">
          <tbody>
            <tr className="border-b border-slate-100">
              <td className="px-3 py-2 font-semibold">المواد</td>
              <td className="px-3 py-2">{quotation.materials_total || 0}</td>
            </tr>
            <tr className="border-b border-slate-100">
              <td className="px-3 py-2 font-semibold">العمالة</td>
              <td className="px-3 py-2">{quotation.labor_total || 0}</td>
            </tr>
            <tr className="border-b border-slate-100">
              <td className="px-3 py-2 font-semibold">المعدات</td>
              <td className="px-3 py-2">{quotation.equipment_total || 0}</td>
            </tr>
            <tr className="border-b border-slate-100">
              <td className="px-3 py-2 font-semibold">Overhead</td>
              <td className="px-3 py-2">{quotation.overhead_value || 0}</td>
            </tr>
            <tr className="border-b border-slate-100">
              <td className="px-3 py-2 font-semibold">Contingency</td>
              <td className="px-3 py-2">{quotation.contingency_value || 0}</td>
            </tr>
            <tr className="border-b border-slate-100">
              <td className="px-3 py-2 font-semibold">Profit</td>
              <td className="px-3 py-2">{quotation.profit_value || 0}</td>
            </tr>
            <tr className="bg-emerald-50">
              <td className="px-3 py-2 text-base font-black text-emerald-700">الإجمالي النهائي</td>
              <td className="px-3 py-2 text-base font-black text-emerald-700">
                {quotation.grand_total || quotation.total || 0}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={() => window.print()}
        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
      >
        طباعة عرض السعر
      </button>
    </div>
  )
}

export default Quotation
