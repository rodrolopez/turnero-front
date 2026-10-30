import { BrowserRouter, Link, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { PublicLayout } from './layouts/PublicLayout'
import { DashboardLayout } from './layouts/DashboardLayout'
import { lazy, Suspense } from 'react'
import { Loading } from './components/Feedback'
const LandingPage = lazy(() => import('./pages/LandingPage'))
const ForcePasswordChangePage = lazy(() => import('./pages/ForcePasswordChangePage'))
const AuthPage = lazy(() => import('./pages/AuthPage').then((module) => ({ default: module.AuthPage })))
const TenantsPage = lazy(() => import('./pages/TenantsPage').then((module) => ({ default: module.TenantsPage })))
const StatisticsPage = lazy(() => import('./pages/StatisticsPage'))
const FinancePage = lazy(() => import('./pages/FinancePage'))
const AgendaPage = lazy(() => import('./pages/AgendaPage'))
const PublicBookingPage = lazy(() => import('./pages/PublicBookingPage'))
const BranchesPage = lazy(() => import('./pages/CatalogPages').then((module) => ({ default: module.BranchesPage })))
const ServicesPage = lazy(() => import('./pages/CatalogPages').then((module) => ({ default: module.ServicesPage })))
const ProfessionalsPage = lazy(() => import('./pages/CatalogPages').then((module) => ({ default: module.ProfessionalsPage })))
const DashboardPage = lazy(() => import('./pages/DashboardPage').then((module) => ({ default: module.DashboardPage })))
import { useAuthStore } from './stores/useAuthStore'

function RequireSession() {
  const accessToken = useAuthStore((state) => state.accessToken)
  const challenge = useAuthStore((state) => state.passwordChallenge)
  if (challenge) return <Navigate to="/force-password-change" replace />
  return accessToken ? <Outlet /> : <Navigate to="/login" replace />
}
function GuestOnly() {
  const accessToken = useAuthStore((state) => state.accessToken)
  const challenge = useAuthStore((state) => state.passwordChallenge)
  if (challenge) return <Navigate to="/force-password-change" replace />
  return accessToken ? <Navigate to="/tenants" replace /> : <Outlet />
}
export default function App() {
  return <BrowserRouter><Suspense fallback={<Loading />}><Routes>
    <Route path="/" element={<LandingPage />} />
    <Route element={<PublicLayout />}>
      <Route path="force-password-change" element={<ForcePasswordChangePage />} />
      <Route path=":tenantSlug/reservar" element={<PublicBookingPage />} />
      <Route element={<GuestOnly />}>
        <Route path="login" element={<AuthPage key="login" mode="login" />} />
        <Route path="register" element={<AuthPage key="register" mode="register" />} />
      </Route>
      <Route element={<RequireSession />}><Route path="tenants" element={<TenantsPage />} /></Route>
      <Route path="*" element={<section className="card mx-auto max-w-lg text-center"><h1 className="text-2xl font-semibold">Página no encontrada</h1><Link to="/" className="btn-primary mt-6">Volver al inicio</Link></section>} />
    </Route>
    <Route element={<RequireSession />}><Route path="dashboard" element={<DashboardLayout />}><Route index element={<Navigate to="agenda" replace />} /><Route path="agenda" element={<AgendaPage />} /><Route path="finance" element={<FinancePage />} /><Route path="finance/statistics" element={<StatisticsPage />} /><Route path="statistics" element={<Navigate to="/dashboard/finance/statistics" replace />} /><Route path="settings" element={<DashboardPage />} /><Route path="branches" element={<BranchesPage />} /><Route path="services" element={<ServicesPage />} /><Route path="professionals" element={<ProfessionalsPage />} /></Route></Route>
  </Routes></Suspense></BrowserRouter>
}
