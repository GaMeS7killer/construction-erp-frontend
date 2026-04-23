import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getClients } from '../api/clients'
import { getProjects } from '../api/projects'
import LoadingSpinner from '../components/LoadingSpinner'
import StatusBadge from '../components/StatusBadge'

const extractList = (payload) => {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.data)) return payload.data
  return []
}
const formatDate = (dateValue) => (dateValue ? new Date(dateValue).toLocaleDateString('ar-EG') : '-')

function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [clients, setClients] = useState([])
  const [projects, setProjects] = useState([])

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError('')
      try {
        const [clientsRes, projectsRes] = await Promise.all([getClients(), getProjects()])
        setClients(extractList(clientsRes.data))
        setProjects(extractList(projectsRes.data))
      } catch {
        setError('تعذر تحميل بيانات لوحة التحكم. حاول مرة أخرى.')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const activeProjects = projects.filter((project) => project.status === 'in_progress').length
  const recentProjects = projects.slice(0, 5)

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">لوحة التحكم</h1>
        <p className="text-sm text-slate-500">نظرة سريعة على وضع المشاريع والعملاء</p>
      </div>

      {error && <div className="rounded-lg bg-red-100 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">إجمالي المشاريع</p>
          <p className="mt-2 text-3xl font-black text-slate-900">{projects.length}</p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">إجمالي العملاء</p>
          <p className="mt-2 text-3xl font-black text-slate-900">{clients.length}</p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">المشاريع النشطة</p>
          <p className="mt-2 text-3xl font-black text-slate-900">{activeProjects}</p>
        </div>
      </div>

      <div className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-slate-800">أحدث المشاريع</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-right text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-3 py-2 font-semibold">اسم المشروع</th>
                <th className="px-3 py-2 font-semibold">الحالة</th>
                <th className="px-3 py-2 font-semibold">تاريخ البدء</th>
              </tr>
            </thead>
            <tbody>
              {recentProjects.map((project) => (
                <tr key={project.id} className="border-b border-slate-100">
                  <td className="px-3 py-3 font-medium">{project.name}</td>
                  <td className="px-3 py-3">
                    <StatusBadge status={project.status} />
                  </td>
                  <td className="px-3 py-3 text-slate-600">{formatDate(project.start_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link to="/projects" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
          إدارة المشاريع
        </Link>
        <Link to="/clients" className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white">
          إدارة العملاء
        </Link>
        <Link to="/catalogs" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">
          إدارة الكتالوجات
        </Link>
      </div>
    </div>
  )
}

export default Dashboard
