'use client';

import { useAuth } from './AuthProvider';
import Navbar from './Navbar';

interface ProtectedLayoutProps {
  children: React.ReactNode;
}

export default function ProtectedLayout({ children }: ProtectedLayoutProps) {
  const { isAuthenticated, handleLogout } = useAuth();

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      {/* Botón de logout */}
      <div className="absolute top-4 right-4 z-50">
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
        >
          Cerrar Sesión
        </button>
      </div>
      {children}
    </div>
  );
}

