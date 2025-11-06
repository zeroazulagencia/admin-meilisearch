'use client';

import { useState, useEffect } from 'react';
import {
  Bars3Icon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';

interface HeaderProps {
  onMenuClick: () => void;
  isMobileOpen: boolean;
}

export default function Header({ onMenuClick, isMobileOpen }: HeaderProps) {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const userStr = localStorage.getItem('admin-user');
        if (userStr) {
          // Intentar parsear como JSON, si falla usar como string simple
          try {
            const parsed = JSON.parse(userStr);
            setUser(parsed);
          } catch {
            // Si no es JSON válido, puede ser un string simple (email)
            setUser({ email: userStr });
          }
        }
      } catch (e) {
        console.error('Error loading user:', e);
      }
    }
  }, []);

  return (
    <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
      {/* Botón menú móvil */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
        aria-label="Toggle menu"
      >
        <Bars3Icon className="w-6 h-6" />
      </button>

      {/* Spacer para centrar contenido en móvil */}
      <div className="flex-1 lg:hidden" />

      {/* Icono del usuario */}
      <div className="flex items-center gap-2">
        <UserCircleIcon className="w-6 h-6 text-gray-600" />
        {user?.email && (
          <span className="hidden sm:block text-sm text-gray-600 truncate max-w-[200px]">
            {user.email}
          </span>
        )}
      </div>
    </header>
  );
}

