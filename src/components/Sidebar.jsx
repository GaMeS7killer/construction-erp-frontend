import { NavLink } from 'react-router-dom'

const navItems = [
  { path: '/', label: 'لوحة التحكم', icon: '📊' },
  { path: '/clients', label: 'العملاء', icon: '👥' },
  { path: '/projects', label: 'المشاريع', icon: '🏗️' },
  { path: '/catalogs', label: 'الكتالوجات', icon: '📦' },
]

function Sidebar({ isOpen, onClose }) {
  const baseClasses =
    'fixed right-0 top-0 z-40 min-h-screen w-[240px] bg-slate-900 text-white shadow-2xl transition-transform md:sticky md:translate-x-0'

  return (
    <>
      <aside className={`${baseClasses} ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="border-b border-slate-700 p-5">
          <div className="text-lg font-black">Construction ERP</div>
          <div className="mt-1 text-sm text-slate-300">نظام إدارة شركات المقاولات</div>
        </div>
        <nav className="space-y-1 p-4">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition ${
                  isActive ? 'bg-blue-500 text-white' : 'text-slate-200 hover:bg-slate-800'
                }`
              }
            >
              <span aria-hidden>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
      {isOpen && (
        <button
          type="button"
          aria-label="إغلاق القائمة"
          className="fixed inset-0 z-30 bg-slate-900/20 md:hidden"
          onClick={onClose}
        />
      )}
    </>
  )
}

export default Sidebar
