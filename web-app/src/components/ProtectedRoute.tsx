import { type ReactNode, useEffect } from 'react'
import { useNavigate, Outlet } from 'react-router-dom'
import { useUserRole, type UserRole } from '../hooks/useUserRole'

interface ProtectedRouteProps {
  /** Roles that are allowed to access this route */
  allowedRoles: UserRole[]
  /** Content to render when authorized. Falls back to <Outlet /> if omitted. */
  children?: ReactNode
  /** Override the effective role (e.g., for company_admin promotion) */
  effectiveRole?: UserRole
}

/**
 * Route guard that renders children only when the user's role
 * is included in `allowedRoles`. Redirects to `/` otherwise.
 *
 * Uses `useNavigate` imperatively (rather than `<Navigate>`) to avoid
 * keeping children in the React tree during concurrent-mode transitions.
 */
export function ProtectedRoute({
  allowedRoles,
  children,
  effectiveRole,
}: ProtectedRouteProps) {
  const options = allowedRoles.includes('company_admin')
    ? { companyAdmin: true }
    : undefined
  const { role, isLoading } = useUserRole(options)
  const navigate = useNavigate()
  const resolvedRole = effectiveRole ?? role
  const shouldRedirect = !isLoading && !allowedRoles.includes(resolvedRole)

  useEffect(() => {
    if (shouldRedirect) {
      navigate('/', { replace: true })
    }
  }, [shouldRedirect, navigate])

  if (isLoading) {
    return <div>Checking access…</div>
  }

  if (shouldRedirect) {
    return null
  }

  return children ? <>{children}</> : <Outlet />
}
