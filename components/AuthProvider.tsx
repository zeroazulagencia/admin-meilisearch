'use client';

import { useState, useEffect, useCallback, useRef, createContext, useContext } from 'react';
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

  // Stabilize mutable values in refs so useCallback deps stay constant
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  const routerRef = useRef(router);
  routerRef.current = router;

  // ─── Stable helpers ────────────────────────────────────────
  const clearSessionData = useCallback(() => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('admin-authenticated');
    localStorage.removeItem('admin-user');
    localStorage.removeItem('admin-login-time');
    localStorage.removeItem('admin-user-id');
    localStorage.removeItem('admin-permissions');
  }, []);

  const handleLogin = useCallback((authenticated: boolean) => {
    setIsAuthenticated(authenticated);
  }, []);

  const handleLogout = useCallback(() => {
    clearSessionData();
    setIsAuthenticated(false);
    router.push('/');
  }, [clearSessionData, router]);

  // ─── Core auth check (stable identity — no changing deps) ──
  const checkAuth = useCallback(() => {
    if (typeof window === 'undefined') {
      setIsLoading(false);
      setIsAuthenticated(false);
      return;
    }

    try {
      const authenticated = localStorage.getItem('admin-authenticated');
      const loginTime = localStorage.getItem('admin-login-time');
      const rawPermissions = localStorage.getItem('admin-permissions');

      console.log('[AuthProvider] Verificando autenticación:', {
        authenticated,
        hasLoginTime: !!loginTime,
        currentPath: pathnameRef.current,
      });

      if (authenticated !== 'true' || !loginTime || !rawPermissions) {
        console.log('[AuthProvider] No hay sesión válida');
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      let userPermissions: any;
      try {
        userPermissions = JSON.parse(rawPermissions);
      } catch {
        console.error('[AuthProvider] Permisos corruptos, limpiando');
        clearSessionData();
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      // Check expiry
      const hoursDiff =
        (Date.now() - new Date(loginTime).getTime()) / (1000 * 60 * 60);
      if (hoursDiff >= 24) {
        console.log('[AuthProvider] Sesión expirada (>24h)');
        clearSessionData();
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      setIsAuthenticated(true);

      // Check route access
      const currentP = pathnameRef.current;
      if (currentP && !hasAccessToRoute(currentP, userPermissions)) {
        const firstRoute = findFirstAccessibleRoute(userPermissions);
        if (firstRoute && firstRoute !== currentP) {
          console.log('[AuthProvider] Redirigiendo:', firstRoute);
          router.push(firstRoute);
        } else if (userPermissions.canLogin === true) {
          console.log('[AuthProvider] Sin acceso específico → /dashboard');
          router.push('/dashboard');
        } else {
          console.log('[AuthProvider] Sin permisos → logout');
          clearSessionData();
          setIsAuthenticated(false);
          router.push('/');
        }
      }
    } catch (error) {
      console.error('[AuthProvider] Error en checkAuth:', error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, [clearSessionData, router]);

  // ─── Refresh (stable identity) ─────────────────────────────
  const refreshSession = useCallback(() => {
    setIsLoading(true);
    checkAuth();
  }, [checkAuth]);

  // ─── Effects ───────────────────────────────────────────────
  // Initial mount — run once
  useEffect(() => {
    console.log('[AuthProvider] Mount inicial, pathname:', pathname);
    refreshSession();
  }, [refreshSession]); // refreshSession is stable ✓

  // Storage + visibility listeners — stable
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onStorage = (e: StorageEvent) => {
      if (e.key?.startsWith('admin-')) refreshSession();
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') refreshSession();
    };

    window.addEventListener('storage', onStorage);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('storage', onStorage);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [refreshSession]);

  // Guard redirect when not authenticated on protected routes
  const protectedRoutes = [
    '/dashboard', '/admin-conocimiento', '/ejecuciones',
    '/conversaciones', '/consumo-api', '/clientes',
    '/agentes', '/modulos',
  ];
  const isProtectedRoute =
    pathname && protectedRoutes.some((r) => pathname.startsWith(r));

  useEffect(() => {
    if (!isLoading && !isAuthenticated && isProtectedRoute) {
      console.log('[AuthProvider] Redirecting to / (unauthorized)');
      router.replace('/');
    }
  }, [isAuthenticated, isLoading, isProtectedRoute, router]);

  // ─── Render ────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div
            className="inline-block animate-spin h-8 w-8 border-2 border-t-transparent rounded-full"
            style={{ borderColor: '#5DE1E5' }}
          ></div>
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
            <h2 className="text-2xl font-semibold text-gray-900">
              Sesión requerida
            </h2>
            <p className="text-gray-600 mt-2">
              Tu sesión expiró o no existe. Inicia sesión nuevamente para continuar.
            </p>
          </div>
          <LoginForm onLogin={handleLogin} />
        </div>
      </div>
    );
  }

  const authContext = {
    isAuthenticated,
    isLoading,
    handleLogin,
    handleLogout,
    refreshSession,
  };

  return (
    <AuthContext.Provider value={authContext}>
      {children}
    </AuthContext.Provider>
  );
}
