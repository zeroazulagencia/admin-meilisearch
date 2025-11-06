'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import settings from '../settings.json';

export default function Navbar() {
  const pathname = usePathname();
  const [permissions, setPermissions] = useState<any>(null);

  useEffect(() => {
    // Cargar permisos desde localStorage
    try {
      const perms = localStorage.getItem('admin-permissions');
      if (perms) {
        setPermissions(JSON.parse(perms));
      }
    } catch (e) {
      console.error('Error loading permissions:', e);
    }
  }, []);

  const allNavItems = [
    { href: '/dashboard', label: 'Dashboard', perm: 'dashboard' },
    { href: '/admin-conocimiento', label: 'Admin Conocimiento', perm: 'conocimiento' },
    { href: '/ejecuciones', label: 'Ejecuciones', perm: 'ejecuciones' },
    { href: '/conversaciones', label: 'Conversaciones', perm: 'conversaciones' },
    { href: '/consumo-api', label: 'Consumo API', perm: 'consumoApi' },
    { href: '/clientes', label: 'Clientes', perm: 'clientes' },
    { href: '/agentes', label: 'Agentes', perm: 'agentes' },
  ];

  // Filtrar items según permisos
  const navItems = allNavItems.filter(item => {
    if (!permissions) return true; // Si no hay permisos cargados, mostrar todo
    if (permissions.type === 'admin') return true; // Admin ve todo
    // Cliente normal: verificar permisos por sección
    const sectionPerms = permissions[item.perm];
    return sectionPerms && (sectionPerms.viewOwn || sectionPerms.viewAll);
  });

  return (
    <nav className="bg-white shadow-lg border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center gap-3">
              <h1 className="text-xl font-bold text-gray-900">DWORKERS Zero Azul</h1>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                {settings.proyecto.version}
              </span>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                      isActive
                        ? 'text-gray-900'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                    style={isActive ? { borderBottomColor: '#5DE1E5' } : {}}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

