'use client';

import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import LoginForm from './LoginForm';
import { hasAccessToRoute, getPermissions, findFirstAccessibleRoute } from '@/utils/permissions';

interface AuthProviderProps {
  children: React.ReactNode;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  handleLogin: (authenticated: boolean) => void;
  handleLogout: () => void;
  refreshSession: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export default function AuthProvider({ children }: AuthProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  const clearSessionData = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }
    localStorage.removeItem('admin-authenticated');
    localStorage.removeItem('admin-user');
    localStorage.removeItem('admin-login-time');
    localStorage.removeItem('admin-user-id');
    localStorage.removeItem('admin-permissions');
  }, []);

  const handleLogout = useCallback(() => {
    clearSessionData();
    setIsAuthenticated(false);
    router.push('/');
  }, [clearSessionData, router]);

  const checkAuth = useCallback(() => {
    if (typeof window === 'undefined') {
      setIsLoading(false);
      setIsAuthenticated(false);
      return;
    }

    try {
      const authenticated = localStorage.getItem('admin-authenticated');
      const loginTime = localStorage.getItem('admin-login-time');

      console.log('[AuthProvider] Verificando autenticación:', { authenticated, hasLoginTime: !!loginTime, pathname });

      if (authenticated === 'true' && loginTime) {
        const loginDate = new Date(loginTime);
        const now = new Date();
        const hoursDiff = (now.getTime() - loginDate.getTime()) / (1000 * 60 * 60);

        if (hoursDiff < 24) {
          const rawPermissions = localStorage.getItem('admin-permissions');
          let userPermissions: any = null;

          try {
            userPermissions = rawPermissions ? JSON.parse(rawPermissions) : null;
          } catch (parseError) {
            console.error('[AuthProvider] No se pudieron parsear los permisos, limpiando sesión', parseError);
          }

          if (!userPermissions) {
            console.warn('[AuthProvider] Permisos faltantes o inválidos, limpiando sesión');
            clearSessionData();
            setIsAuthenticated(false);
            router.push('/');
            return;
          }

          setIsAuthenticated(true);

          if (pathname && !hasAccessToRoute(pathname, userPermissions)) {
            const firstRoute = findFirstAccessibleRoute(userPermissions);
            if (firstRoute && firstRoute !== pathname) {
              console.log('[AuthProvider] Redirigiendo a primera ruta accesible:', firstRoute);
              router.push(firstRoute);
            } else if (userPermissions.canLogin === true) {
              console.log('[AuthProvider] Sin acceso específico, enviando a dashboard');
              router.push('/dashboard');
            } else {
              console.log('[AuthProvider] Sin permisos, cerrando sesión');
              clearSessionData();
              setIsAuthenticated(false);
              router.push('/');
            }
          }
        } else {
          console.log('[AuthProvider] Sesión expirada');
          clearSessionData();
          setIsAuthenticated(false);
        }
      } else {
        console.log('[AuthProvider] No hay sesión válida');
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('[AuthProvider] Error en checkAuth:', error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, [clearSessionData, pathname, router]);

  const refreshSession = useCallback(() => {
    setIsLoading(true);
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      console.log('[AuthProvider] Timeout alcanzado, forzando fin de carga');
      setIsLoading(false);
    }, 2000);

    refreshSession();

    return () => {
      clearTimeout(timeout);
    };
  }, [refreshSession]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleStorageChange = (event: StorageEvent) => {
      if (!event.key) return;
      if (!event.key.startsWith('admin-')) return;
      console.log('[AuthProvider] Cambio en storage detectado, revalidando sesión');
      refreshSession();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[AuthProvider] Ventana activa, revalidando sesión');
        refreshSession();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshSession]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      console.log('[AuthProvider] Sesión no válida para ruta protegida');
    }
  }, [isAuthenticated, isLoading]);

  const handleLogin = (authenticated: boolean) => {
    setIsAuthenticated(authenticated);
  };

  // Rutas públicas que no requieren autenticación
  const isPublicRoute = pathname === '/';

  // Rutas protegidas que requieren autenticación
  const protectedRoutes = ['/dashboard', '/admin-conocimiento', '/ejecuciones', '/conversaciones', '/consumo-api', '/clientes', '/agentes', '/modulos'];
  const isProtectedRoute = pathname && protectedRoutes.some(route => pathname.startsWith(route));

  useEffect(() => {
    if (!isLoading && !isAuthenticated && isProtectedRoute) {
      router.replace('/');
    }
  }, [isAuthenticated, isLoading, isProtectedRoute, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin h-8 w-8 border-2 border-t-transparent rounded-full" style={{ borderColor: '#5DE1E5' }}></div>
          <p className="mt-2 text-gray-600">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated && isProtectedRoute) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-lg w-full space-y-6 px-4">
          <div className="bg-white rounded-2xl shadow p-6 text-center">
            <h2 className="text-2xl font-semibold text-gray-900">Sesión requerida</h2>
            <p className="text-gray-600 mt-2">Tu sesión expiró o no existe. Inicia sesión nuevamente para continuar.</p>
          </div>
          <LoginForm onLogin={handleLogin} />
        </div>
      </div>
    );
  }

  // Exportar funciones de login/logout para uso en landing page
  const authContext = {
    isAuthenticated,
    isLoading,
    handleLogin,
    handleLogout,
    refreshSession
  };

  return (
    <AuthContext.Provider value={authContext}>
      {children}
    </AuthContext.Provider>
  );
}
