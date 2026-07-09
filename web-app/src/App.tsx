import { useRoutes, Navigate } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute'
import { CompanyDashboard } from './views/CompanyDashboard'
import { EmployeePortfolio } from './views/EmployeePortfolio'
import { RegistrationPage } from './views/RegistrationPage'
import HomePage from './views/HomePage'

function App() {
  return useRoutes([
    { path: '/', element: <HomePage /> },
    {
      path: '/dashboard',
      element: (
        <ProtectedRoute allowedRoles={['company_admin']}>
          <CompanyDashboard />
        </ProtectedRoute>
      ),
    },
    {
      path: '/portfolio',
      element: (
        <ProtectedRoute allowedRoles={['employee']}>
          <EmployeePortfolio />
        </ProtectedRoute>
      ),
    },
    {
      path: '/company',
      element: (
        <ProtectedRoute allowedRoles={['admin', 'visitor', 'company_admin']}>
          <RegistrationPage />
        </ProtectedRoute>
      ),
    },
    { path: '*', element: <Navigate to="/" replace /> },
  ])
}

export default App
