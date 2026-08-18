import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import { ToastProvider } from './components/Toast'
import AnalyticsPage from './pages/AnalyticsPage'
import CompDetailPage from './pages/CompDetailPage'
import ComparePage from './pages/ComparePage'
import CompsListPage from './pages/CompsListPage'
import './index.css'

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<CompsListPage />} />
            <Route path="/comps/:compId" element={<CompDetailPage />} />
            <Route path="/compare" element={<ComparePage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </ToastProvider>
    </BrowserRouter>
  )
}
