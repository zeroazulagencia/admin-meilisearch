'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import settings from '../settings.json';

export default function Navbar() {
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: 'Dashboard' },
    { href: '/admin-conocimiento', label: 'Admin Conocimiento' },
    { href: '/ejecuciones', label: 'Ejecuciones' },
    { href: '/conversaciones', label: 'Conversaciones' },
    { href: '/consumo-api', label: 'Consumo API' },
  ];

  return (
    <nav className="bg-white shadow-lg border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center gap-3">
              <h1 className="text-xl font-bold text-gray-900">Admin Zero Azul</h1>
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
                        ? 'border-blue-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
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

