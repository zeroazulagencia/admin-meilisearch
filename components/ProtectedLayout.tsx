'use client';

import { useAuth } from './AuthProvider';
import AdminLayout from './AdminLayout';

interface ProtectedLayoutProps {
  children: React.ReactNode;
}

export default function ProtectedLayout({ children }: ProtectedLayoutProps) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return null;
  }

  return (
    <AdminLayout>
      {children}
    </AdminLayout>
  );
}

