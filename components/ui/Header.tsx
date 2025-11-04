'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/components/AuthProvider';
import {
  Bars3Icon,
  ArrowRightOnRectangleIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';

interface HeaderProps {
  onMenuClick: () => void;
  isMobileOpen: boolean;
}

export default function Header({ onMenuClick, isMobileOpen }: HeaderProps) {
  const { handleLogout } = useAuth();
  const [user, setUser] = useState<any>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const userStr = localStorage.getItem('admin-user');
        if (userStr) {
          setUser(JSON.parse(userStr));
        }
      } catch (e) {
        console.error('Error loading user:', e);
      }
    }
  }, []);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDropdown]);

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

      {/* Información del usuario y dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <UserCircleIcon className="w-6 h-6 text-gray-600" />
          <div className="hidden sm:block text-left">
            <p className="text-sm font-medium text-gray-900">
              {user?.name || user?.email || 'Usuario'}
            </p>
            {user?.email && user?.name && (
              <p className="text-xs text-gray-500">{user.email}</p>
            )}
          </div>
        </button>

        {/* Dropdown */}
        {showDropdown && (
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
            <div className="px-4 py-2 border-b border-gray-200">
              <p className="text-sm font-medium text-gray-900">
                {user?.name || 'Usuario'}
              </p>
              {user?.email && (
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
              )}
            </div>
            <button
              onClick={() => {
                setShowDropdown(false);
                handleLogout();
              }}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <ArrowRightOnRectangleIcon className="w-5 h-5" />
              Cerrar Sesión
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

