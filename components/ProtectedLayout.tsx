'use client';

import { useAuth } from './AuthProvider';
import AdminLayout from './AdminLayout';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { hasAccessToRoute, getPermissions } from '@/utils/permissions';

interface ProtectedLayoutProps {
  children: React.ReactNode;
}

export default function ProtectedLayout({ children }: ProtectedLayoutProps) {
  const { isAuthenticated } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated && pathname) {
      const permissions = getPermissions();
      if (permissions && !hasAccessToRoute(pathname, permissions)) {
        // Sin acceso a esta ruta, verificar si tiene acceso al dashboard
        if (hasAccessToRoute('/dashboard', permissions)) {
          router.push('/dashboard');
        } else {
          // No tiene acceso, cerrar sesión
          localStorage.removeItem('admin-authenticated');
          localStorage.removeItem('admin-user');
          localStorage.removeItem('admin-login-time');
          localStorage.removeItem('admin-user-id');
          localStorage.removeItem('admin-permissions');
          router.push('/');
        }
      }
    }
  }, [isAuthenticated, pathname, router]);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <AdminLayout>
      {children}
    </AdminLayout>
  );
}

