import { useRoutes, Navigate } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute'
import { EmployeePortfolio } from './views/EmployeePortfolio'
import { MintNftPage } from './views/MintNftPage'
import { RegistrationPage } from './views/RegistrationPage'
import HomePage from './views/HomePage'

function App() {
  return useRoutes([
    { path: '/', element: <HomePage /> },
    {
      path: '/portfolio',
      element: (
        <ProtectedRoute allowedRoles={['employee', 'minter', 'company_admin']}>
          <EmployeePortfolio />
        </ProtectedRoute>
      ),
    },
    {
      path: '/mint',
      element: (
        <ProtectedRoute allowedRoles={['minter']}>
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
