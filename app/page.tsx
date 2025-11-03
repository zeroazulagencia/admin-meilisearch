'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';

export default function Home() {
  const { isAuthenticated, handleLogin } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Si está autenticado, redirigir al dashboard
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  // Si está autenticado, mostrar loading mientras redirige
  if (isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full"></div>
          <p className="mt-2 text-gray-600">Redirigiendo...</p>
        </div>
      </div>
    );
  }

  // Limpiar auto-fill al cargar
  useEffect(() => {
    setTimeout(() => {
      const usernameInput = document.getElementById('landing-username') as HTMLInputElement;
      const passwordInput = document.getElementById('landing-password') as HTMLInputElement;
      if (usernameInput) {
        usernameInput.value = '';
        usernameInput.setAttribute('autocomplete', 'off');
      }
      if (passwordInput) {
        passwordInput.value = '';
        passwordInput.setAttribute('autocomplete', 'new-password');
      }
    }, 100);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: username, password })
      });
      
      const data = await res.json();
      
      if (!res.ok || !data.ok) {
        setError(data?.error || 'Credenciales incorrectas');
        setLoading(false);
        return;
      }

      // Guardar sesión completa en localStorage incluyendo permisos
      localStorage.setItem('admin-authenticated', 'true');
      localStorage.setItem('admin-user', data.user?.email || '');
      localStorage.setItem('admin-login-time', new Date().toISOString());
      localStorage.setItem('admin-user-id', String(data.user?.id || ''));
      localStorage.setItem('admin-permissions', JSON.stringify(data.user?.permissions || {}));

      handleLogin(true);
      router.push('/dashboard');
    } catch (err) {
      console.error('ERROR COMPLETO:', err);
      setError(`Error al iniciar sesión: ${err}`);
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">DW</span>
              </div>
              <h1 className="text-xl font-bold text-gray-900">DWORKERS Zero Azul</h1>
            </div>
            <nav className="hidden md:flex space-x-8">
              <a href="#features" className="text-gray-600 hover:text-gray-900">Características</a>
              <a href="#about" className="text-gray-600 hover:text-gray-900">Acerca de</a>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center min-h-[calc(100vh-4rem)] py-8 lg:py-12">
          {/* Left Side - Content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h2 className="text-4xl sm:text-5xl font-extrabold text-gray-900 leading-tight">
                Unlock The Power of <span className="underline decoration-yellow-400 decoration-4">DWORKERS</span> AI
                <br />
                Create Content Faster
              </h2>
              <p className="text-base sm:text-lg text-gray-600 leading-relaxed">
                Generate dynamic & compelling content effortlessly with our AI writing tool. 
                Whether you need blog posts, social media captions, or product descriptions.
              </p>
            </div>

            {/* Login Form */}
            <div className="bg-gray-50 rounded-2xl p-6 shadow-lg border border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Iniciar Sesión</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="landing-username" className="sr-only">
                    Correo
                  </label>
                  <input
                    id="landing-username"
                    name="username"
                    type="text"
                    required
                    autoComplete="off"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Correo electrónico"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="landing-password" className="sr-only">
                    Contraseña
                  </label>
                  <input
                    id="landing-password"
                    name="password"
                    type="password"
                    required
                    autoComplete="new-password"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Contraseña"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                {error && (
                  <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <span className="inline-block animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-2"></span>
                      Iniciando sesión...
                    </span>
                  ) : (
                    'Iniciar Sesión'
                  )}
                </button>
              </form>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={() => document.getElementById('landing-username')?.focus()}
                className="bg-yellow-400 text-gray-900 px-6 sm:px-8 py-3 rounded-lg font-semibold hover:bg-yellow-500 transition-colors text-center"
              >
                Comenzar Gratis
              </button>
              <button 
                onClick={() => {
                  const featuresSection = document.getElementById('features');
                  featuresSection?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="bg-gray-200 text-gray-900 px-6 sm:px-8 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors text-center"
              >
                Ver Características
              </button>
            </div>
          </div>

          {/* Right Side - Illustration */}
          <div className="hidden lg:block relative">
            <div className="relative bg-gradient-to-br from-blue-50 to-gray-100 rounded-3xl p-8 h-full min-h-[500px] flex items-center justify-center">
              {/* Placeholder illustration - puede reemplazarse con SVG o imagen */}
              <div className="text-center space-y-4">
                <div className="w-32 h-32 bg-blue-600 rounded-full mx-auto flex items-center justify-center">
                  <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div className="space-y-2">
                  <div className="w-64 h-4 bg-gray-300 rounded mx-auto"></div>
                  <div className="w-56 h-4 bg-gray-300 rounded mx-auto"></div>
                  <div className="w-48 h-4 bg-gray-300 rounded mx-auto"></div>
                </div>
                <div className="flex justify-center gap-2 mt-6">
                  <div className="w-12 h-12 bg-yellow-400 rounded-lg flex items-center justify-center">
                    <span className="text-gray-900 font-bold">A</span>
                  </div>
                  <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <section id="features" className="py-16 border-t border-gray-200">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">Características Principales</h3>
            <p className="text-gray-600">Todo lo que necesitas para gestionar tus agentes de IA</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-xl border border-gray-200 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">Gestión de Agentes</h4>
              <p className="text-gray-600">Administra y configura tus agentes de IA de forma centralizada.</p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-200 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">Conversaciones</h4>
              <p className="text-gray-600">Revisa y analiza todas las conversaciones de tus agentes.</p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-200 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">Base de Conocimiento</h4>
              <p className="text-gray-600">Gestiona el conocimiento de tus agentes con búsqueda avanzada.</p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-gray-400">© 2025 DWORKERS Zero Azul. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
