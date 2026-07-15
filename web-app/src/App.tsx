import { useRoutes, Navigate } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute'
import { CompanyDashboard } from './views/CompanyDashboard'
import { EmployeePortfolio } from './views/EmployeePortfolio'
import { MintNftPage } from './views/MintNftPage'
import { MinterDashboard } from './views/MinterDashboard'
import { RegistrationPage } from './views/RegistrationPage'
import HomePage from './views/HomePage'
import { useUserRole } from './hooks/useUserRole'

function DashboardSwitcher() {
  const { role } = useUserRole()
  if (role === 'company_admin') return <CompanyDashboard />
  if (role === 'minter' || role === 'admin') return <MinterDashboard />
  return <Navigate to="/" replace />
}

function App() {
  return useRoutes([
    { path: '/', element: <HomePage /> },
    { path: '/dashboard', element: <DashboardSwitcher /> },
    {
      path: '/portfolio',
      element: (
        <ProtectedRoute allowedRoles={['employee', 'minter']}>
          <EmployeePortfolio />
        </ProtectedRoute>
      ),
    },
    {
      path: '/mint',
      element: (
        <ProtectedRoute allowedRoles={['minter', 'admin', 'company_admin']}>
          <MintNftPage />
        </ProtectedRoute>
      ),
    },
    {
      path: '/company',
      element: (
        <ProtectedRoute allowedRoles={['admin', 'company_admin']}>
          <RegistrationPage />
        </ProtectedRoute>
      ),
    },
    { path: '*', element: <Navigate to="/" replace /> },
  ])
}

export default App
