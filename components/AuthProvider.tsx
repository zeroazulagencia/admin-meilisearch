'use client';

import { useState, useEffect } from 'react';
import LoginForm from './LoginForm';

interface AuthProviderProps {
  children: React.ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Verificar sesión al cargar
    if (typeof window === 'undefined') {
      return;
    }

    const authenticated = localStorage.getItem('admin-authenticated');
    const loginTime = localStorage.getItem('admin-login-time');
    
    if (authenticated === 'true' && loginTime) {
      // Verificar si la sesión no ha expirado (24 horas)
      const loginDate = new Date(loginTime);
      const now = new Date();
      const hoursDiff = (now.getTime() - loginDate.getTime()) / (1000 * 60 * 60);
      
      if (hoursDiff < 24) {
        setIsAuthenticated(true);
      } else {
        // Sesión expirada
        localStorage.removeItem('admin-authenticated');
        localStorage.removeItem('admin-user');
        localStorage.removeItem('admin-login-time');
      }
    }
    
    setIsLoading(false);
  }, []);

  const handleLogin = (authenticated: boolean) => {
    setIsAuthenticated(authenticated);
  };

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('admin-authenticated');
      localStorage.removeItem('admin-user');
      localStorage.removeItem('admin-login-time');
    }
    setIsAuthenticated(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full"></div>
          <p className="mt-2 text-gray-600">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginForm onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
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
