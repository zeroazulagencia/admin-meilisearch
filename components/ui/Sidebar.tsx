'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import {
  ChartBarIcon,
  BookOpenIcon,
  PlayIcon,
  ChatBubbleLeftRightIcon,
  UsersIcon,
  UserGroupIcon,
  Bars3Icon,
} from '@heroicons/react/24/outline';
import SidebarItem from './SidebarItem';
import settings from '@/settings.json';

interface NavItem {
  href: string;
  label: string;
  perm: string;
  icon: React.ReactNode;
}

interface SidebarProps {
  permissions: any;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

export default function Sidebar({ permissions, isMobileOpen, setIsMobileOpen }: SidebarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Cargar estado del sidebar desde localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebar-collapsed');
      if (saved !== null) {
        setIsCollapsed(saved === 'true');
      } else {
        // Por defecto: colapsado en móvil, expandido en desktop
        setIsCollapsed(window.innerWidth < 1024);
      }
    }
  }, []);

  // Guardar estado del sidebar
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebar-collapsed', String(isCollapsed));
    }
  }, [isCollapsed]);

  // Cerrar sidebar móvil al cambiar de ruta
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname, setIsMobileOpen]);

  const allNavItems: NavItem[] = [
    { href: '/dashboard', label: 'Dashboard', perm: 'dashboard', icon: <ChartBarIcon className="w-5 h-5" /> },
    { href: '/admin-conocimiento', label: 'Admin Conocimiento', perm: 'conocimiento', icon: <BookOpenIcon className="w-5 h-5" /> },
    { href: '/ejecuciones', label: 'Ejecuciones', perm: 'ejecuciones', icon: <PlayIcon className="w-5 h-5" /> },
    { href: '/conversaciones', label: 'Conversaciones', perm: 'conversaciones', icon: <ChatBubbleLeftRightIcon className="w-5 h-5" /> },
    { href: '/consumo-api', label: 'Consumo API', perm: 'consumoApi', icon: <ChartBarIcon className="w-5 h-5" /> },
    { href: '/clientes', label: 'Clientes', perm: 'clientes', icon: <UsersIcon className="w-5 h-5" /> },
    { href: '/agentes', label: 'Agentes', perm: 'agentes', icon: <UserGroupIcon className="w-5 h-5" /> },
  ];

  // Filtrar items según permisos
  const navItems = allNavItems.filter(item => {
    if (!permissions) return true;
    if (permissions.type === 'admin') return true;
    const sectionPerms = permissions[item.perm];
    return sectionPerms && (sectionPerms.viewOwn || sectionPerms.viewAll);
  });

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <>
      {/* Overlay móvil */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          bg-white border-r border-gray-200
          transition-all duration-300 ease-in-out
          ${isCollapsed ? 'w-16' : 'w-64'}
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          flex flex-col
        `}
      >
        {/* Header del Sidebar */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-gray-900">DWORKERS</h1>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                {settings.proyecto.version}
              </span>
            </div>
          )}
          {isCollapsed && (
            <div className="w-full flex justify-center">
              <div className="w-8 h-8 bg-[#5DE1E5] rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">D</span>
              </div>
            </div>
          )}
          {/* Botón toggle solo visible en desktop */}
          <button
            onClick={toggleSidebar}
            className="hidden lg:flex p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
            title={isCollapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
          >
            <Bars3Icon className="w-5 h-5" />
          </button>
        </div>

        {/* Navegación */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {navItems.map((item) => (
            <SidebarItem
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={item.label}
              isCollapsed={isCollapsed}
            />
          ))}
        </nav>
      </aside>
    </>
  );
}

