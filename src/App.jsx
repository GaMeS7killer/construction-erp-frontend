import { useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Clients from './pages/Clients'
import Projects from './pages/Projects'
import ProjectDetail from './pages/ProjectDetail'
import Quotation from './pages/Quotation'
import Catalogs from './pages/Catalogs'

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  return (
    <BrowserRouter>
      <div className="flex min-h-screen bg-slate-100 text-slate-800">
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <button
              type="button"
              className="mb-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white md:hidden"
              onClick={() => setIsSidebarOpen(true)}
            >
              فتح القائمة
            </button>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/clients" element={<Clients />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/projects/:id" element={<ProjectDetail />} />
              <Route path="/projects/:id/quotation" element={<Quotation />} />
              <Route path="/catalogs" element={<Catalogs />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
      </div>
    </BrowserRouter>
  )
}

export default App
