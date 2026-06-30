import { useAuth } from '@/context/AuthContext';

const ADMIN_ROLES = ['admin', 'super_admin', 'regulator'];

/**
 * Returns helpers for role-gating UI:
 *  - isAdmin: can see all operators' tests, manage users, access admin views
 *  - isFieldTester: restricted to their own operator's tests
 *  - role: raw string from the JWT for custom checks
 */
export function useRole() {
  const { user } = useAuth();
  const role = (user?.role ?? '').toLowerCase();
  const isAdmin = ADMIN_ROLES.some((r) => role.includes(r));
  const isFieldTester = !isAdmin;

  return { role, isAdmin, isFieldTester, operatorId: user?.operatorId ?? null };
}
