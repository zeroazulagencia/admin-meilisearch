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
    try {
      const perms = localStorage.getItem('admin-permissions');
      if (perms) {
        setPermissions(JSON.parse(perms));
      } else {
        // Fallback: intentar obtener permisos desde utils
        const permsFromUtils = getPermissions();
        if (permsFromUtils) {
          setPermissions(permsFromUtils);
        }
      }
    } catch (e) {
      console.error('Error loading permissions:', e);
    }
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

