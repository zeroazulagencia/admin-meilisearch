'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import LoginForm from './LoginForm';
import { hasAccessToRoute, getPermissions, findFirstAccessibleRoute } from '@/utils/permissions';

interface AuthProviderProps {
  children: React.ReactNode;
}

interface AuthContextType {
  isAuthenticated: boolean;
  handleLogin: (authenticated: boolean) => void;
  handleLogout: () => void;
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

  useEffect(() => {
    // Timeout de seguridad para evitar quedarse cargando
    const timeout = setTimeout(() => {
      console.log('[AuthProvider] Timeout alcanzado, forzando fin de carga');
      setIsLoading(false);
    }, 2000);

    // Verificar sesión al cargar
    const checkAuth = () => {
      try {
        if (typeof window === 'undefined') {
          setIsLoading(false);
          return;
        }

        const authenticated = localStorage.getItem('admin-authenticated');
        const loginTime = localStorage.getItem('admin-login-time');
        const permissions = localStorage.getItem('admin-permissions');
        
        console.log('[AuthProvider] Verificando autenticación:', { authenticated, hasLoginTime: !!loginTime, pathname });
        
        if (authenticated === 'true' && loginTime) {
          // Verificar si la sesión no ha expirado (24 horas)
          const loginDate = new Date(loginTime);
          const now = new Date();
          const hoursDiff = (now.getTime() - loginDate.getTime()) / (1000 * 60 * 60);
          
          if (hoursDiff < 24) {
            // Sesión válida, establecer como autenticado
            setIsAuthenticated(true);
            console.log('[AuthProvider] Sesión válida, usuario autenticado');
            
            // Verificar permisos de acceso a la ruta actual
            const userPermissions = getPermissions();
            if (userPermissions && pathname && !hasAccessToRoute(pathname, userPermissions)) {
              // Sin acceso a esta ruta, buscar la primera ruta a la que tiene acceso
              const firstRoute = findFirstAccessibleRoute(userPermissions);
              if (firstRoute) {
                console.log('[AuthProvider] Redirigiendo a:', firstRoute);
                router.push(firstRoute);
              } else {
                // No tiene acceso a ninguna ruta, pero tiene canLogin, dejarlo en dashboard con mensaje
                if (userPermissions.canLogin === true) {
                  console.log('[AuthProvider] Redirigiendo a dashboard');
                  router.push('/dashboard');
                } else {
                  // No tiene acceso ni canLogin, cerrar sesión
                  console.log('[AuthProvider] Sin permisos, cerrando sesión');
                  localStorage.removeItem('admin-authenticated');
                  localStorage.removeItem('admin-user');
                  localStorage.removeItem('admin-login-time');
                  localStorage.removeItem('admin-user-id');
                  localStorage.removeItem('admin-permissions');
                  setIsAuthenticated(false);
                  router.push('/');
                }
              }
            }
          } else {
            // Sesión expirada, limpiar todo
            console.log('[AuthProvider] Sesión expirada');
            localStorage.removeItem('admin-authenticated');
            localStorage.removeItem('admin-user');
            localStorage.removeItem('admin-login-time');
            localStorage.removeItem('admin-user-id');
            localStorage.removeItem('admin-permissions');
            setIsAuthenticated(false);
          }
        } else {
          // No hay sesión válida
          console.log('[AuthProvider] No hay sesión válida');
          setIsAuthenticated(false);
        }
        
        setIsLoading(false);
        clearTimeout(timeout);
      } catch (error) {
        console.error('[AuthProvider] Error en checkAuth:', error);
        setIsLoading(false);
        clearTimeout(timeout);
      }
    };

    checkAuth();

    return () => clearTimeout(timeout);
  }, [pathname, router]);

  const handleLogin = (authenticated: boolean) => {
    setIsAuthenticated(authenticated);
  };

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('admin-authenticated');
      localStorage.removeItem('admin-user');
      localStorage.removeItem('admin-login-time');
      localStorage.removeItem('admin-user-id');
      localStorage.removeItem('admin-permissions');
    }
    setIsAuthenticated(false);
    router.push('/');
  };

  // Rutas públicas que no requieren autenticación
  const publicRoutes = ['/'];
  const isPublicRoute = pathname && publicRoutes.includes(pathname);
  
  // Rutas protegidas que requieren autenticación
  const protectedRoutes = ['/dashboard', '/admin-conocimiento', '/ejecuciones', '/conversaciones', '/consumo-api', '/clientes', '/agentes', '/modulos'];
  const isProtectedRoute = pathname && protectedRoutes.some(route => pathname.startsWith(route));

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

  // Si no está autenticado y es ruta protegida, redirigir a landing page
  if (!isAuthenticated && isProtectedRoute) {
    router.push('/');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin h-8 w-8 border-2 border-t-transparent rounded-full" style={{ borderColor: '#5DE1E5' }}></div>
          <p className="mt-2 text-gray-600">Redirigiendo...</p>
        </div>
      </div>
    );
  }

  // Exportar funciones de login/logout para uso en landing page
  const authContext = {
    isAuthenticated,
    handleLogin,
    handleLogout
  };

  return (
    <AuthContext.Provider value={authContext}>
      {children}
    </AuthContext.Provider>
  );
}
