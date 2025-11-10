'use client';

import { useState, useEffect } from 'react';
import Sidebar from './ui/Sidebar';
import Header from './ui/Header';
import { getPermissions } from '@/utils/permissions';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [permissions, setPermissions] = useState<any>(null);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    // Cargar permisos desde localStorage
    const loadPermissions = () => {
      try {
        const perms = localStorage.getItem('admin-permissions');
        if (perms) {
          const parsed = JSON.parse(perms);
          console.log('[ADMIN_LAYOUT] Permisos cargados:', parsed);
          setPermissions(parsed);
        } else {
          // Fallback: intentar obtener permisos desde utils
          const permsFromUtils = getPermissions();
          if (permsFromUtils) {
            console.log('[ADMIN_LAYOUT] Permisos desde utils:', permsFromUtils);
            setPermissions(permsFromUtils);
          }
        }
      } catch (e) {
        console.error('[ADMIN_LAYOUT] Error loading permissions:', e);
      }
    };

    loadPermissions();

    // Escuchar cambios en localStorage para actualizar permisos
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'admin-permissions') {
        console.log('[ADMIN_LAYOUT] Permisos actualizados en localStorage');
        loadPermissions();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // También verificar periódicamente (por si acaso)
    const interval = setInterval(() => {
      loadPermissions();
    }, 2000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <Sidebar 
        permissions={permissions} 
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header 
          onMenuClick={() => setIsMobileOpen(!isMobileOpen)}
          isMobileOpen={isMobileOpen}
        />

        {/* Contenido */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

