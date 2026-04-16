'use client';

import { useAuth } from './AuthProvider';
import AdminLayout from './AdminLayout';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import { hasAccessToRoute, getPermissions, findFirstAccessibleRoute } from '@/utils/permissions';

interface ProtectedLayoutProps {
  children: React.ReactNode;
}

export default function ProtectedLayout({ children }: ProtectedLayoutProps) {
  const { isAuthenticated, isLoading, refreshSession } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const permissions = useMemo(() => getPermissions(), [isAuthenticated, pathname]);

  useEffect(() => {
    if (!isAuthenticated || !pathname) {
      return;
    }

    if (!permissions) {
      refreshSession();
      return;
    }

    if (!hasAccessToRoute(pathname, permissions)) {
      const firstRoute = findFirstAccessibleRoute(permissions);
      if (firstRoute) {
        router.replace(firstRoute);
      } else if (permissions.canLogin === true) {
        router.replace('/dashboard');
      } else {
        router.replace('/');
      }
    }
  }, [isAuthenticated, pathname, permissions, refreshSession, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin h-8 w-8 border-2 border-t-transparent rounded-full" style={{ borderColor: '#5DE1E5' }}></div>
          <p className="mt-2 text-gray-600">Verificando permisos...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-700">Necesitas iniciar sesión.</p>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout>
      {children}
    </AdminLayout>
  );
}
