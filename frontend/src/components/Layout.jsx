import { NavLink, Outlet } from 'react-router-dom'

const backendLabel = import.meta.env.VITE_BACKEND_LABEL || 'API'
const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'

export default function Layout() {
  const isDotnet =
    String(backendLabel).toLowerCase().includes('dotnet') ||
    String(backendLabel).toLowerCase().includes('.net') ||
    apiBase.includes('8001')

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-block">
          <p className="brand">CRE Comps Explorer</p>
          <p className="brand-sub">Internal comparable sales workspace</p>
          <span className={`backend-badge ${isDotnet ? 'dotnet' : 'python'}`}>
            {backendLabel} · {apiBase}
          </span>
        </div>
        <nav className="nav">
          <NavLink to="/" end>
            Comps
          </NavLink>
          <NavLink to="/analytics">Analytics</NavLink>
        </nav>
      </header>
      <main className="page">
        <Outlet />
      </main>
    </div>
  )
}
