'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useClients, Client } from '@/utils/useClients';

interface LoginFormProps {
  onLogin: (isAuthenticated: boolean) => void;
}

export default function LoginForm({ onLogin }: LoginFormProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { clients, initialized } = useClients();

  useEffect(() => {
    // Verificar si ya hay una sesión activa
    const isAuthenticated = localStorage.getItem('admin-authenticated');
    if (isAuthenticated === 'true') {
      onLogin(true);
    }
  }, [onLogin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Debug extendido
      const raw = typeof window !== 'undefined' ? localStorage.getItem('admin_clients') : null;
      const inputId = username.trim().toLowerCase();
      console.log('Cliente buscando con email/usuario (normalizado):', inputId);
      console.log('LocalStorage raw admin_clients:', raw);
      console.log('Total clientes en hook:', clients.length);
      clients.forEach((c: any, idx: number) => {
        console.log(`Cliente[${idx}]`, {
          id: c.id,
          email: c.email,
          usuario: c.usuario,
          company: c.company,
          hasClave: Boolean(c.clave),
          claveLen: c.clave ? String(c.clave).length : 0,
          hasPassword: Boolean(c.password),
          passwordLen: c.password ? String(c.password).length : 0,
          canLogin: c.permissions?.canLogin
        });
      });

      // Validar contra clientes guardados (email o usuario) y contraseña (clave o password)
      const matched: Client | undefined = clients.find((c: any) => {
        const emailNorm = ((c.email || '') as string).trim().toLowerCase();
        const usuarioNorm = ((c.usuario || '') as string).trim().toLowerCase();
        const byEmail = emailNorm === inputId;
        const byUsuario = usuarioNorm === inputId;
        const passMatch = (c.clave === password) || (c.password === password);
        if ((byEmail || byUsuario) && !passMatch) {
          console.log('Coincide id pero falla contraseña para cliente id:', c.id, 'inputPwdLen:', String(password).length, 'clave:', c.clave, 'password:', c.password);
        }
        return (byEmail || byUsuario) && passMatch;
      });

      console.log('Cliente encontrado:', matched ? { id: (matched as any).id, email: (matched as any).email } : undefined);

      if (!matched) {
        setError('Credenciales incorrectas');
        setLoading(false);
        return;
      }

      // Verificar permiso de login si existe configuración de permisos
      const canLogin = matched.permissions?.canLogin ?? true;
      if (!canLogin) {
        setError('Acceso deshabilitado para este usuario');
        setLoading(false);
        return;
      }

      // Guardar sesión
      localStorage.setItem('admin-authenticated', 'true');
      localStorage.setItem('admin-user', matched.email || matched.usuario || '');
      localStorage.setItem('admin-login-time', new Date().toISOString());
      localStorage.setItem('admin-user-id', String(matched.id));

      onLogin(true);
      router.push('/');
    } catch (err) {
      setError('Error al iniciar sesión');
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Admin Zero Azul
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Inicia sesión para acceder al panel de administración
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="username" className="sr-only">
                Correo
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Correo"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center">
                  <span className="inline-block animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></span>
                  Iniciando sesión...
                </span>
              ) : (
                'Iniciar Sesión'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
