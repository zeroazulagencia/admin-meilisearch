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
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Si está autenticado, redirigir al dashboard
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  // Limpiar auto-fill al cargar y cuando se abre el modal
  useEffect(() => {
    if (!isAuthenticated && showLoginModal) {
      setTimeout(() => {
        const usernameInput = document.getElementById('modal-username') as HTMLInputElement;
        const passwordInput = document.getElementById('modal-password') as HTMLInputElement;
        if (usernameInput) {
          usernameInput.value = '';
          usernameInput.setAttribute('autocomplete', 'off');
        }
        if (passwordInput) {
          passwordInput.value = '';
          passwordInput.setAttribute('autocomplete', 'new-password');
        }
      }, 100);
    }
  }, [isAuthenticated, showLoginModal]);

  // Si está autenticado, mostrar loading mientras redirige
  if (isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin h-8 w-8 border-2 border-[#5DE1E5] border-t-transparent rounded-full"></div>
          <p className="mt-2 text-gray-600">Redirigiendo...</p>
        </div>
      </div>
    );
  }

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
      setShowLoginModal(false);
      setError('');
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
              <img 
                src="/public-img/logo-dworkers.png" 
                alt="DWORKERS Zero Azul" 
                className="h-8 w-auto"
              />
            </div>
            <nav className="hidden md:flex space-x-8 items-center">
              <a href="#features" className="text-gray-600 hover:text-gray-900 transition-colors">Características</a>
              <a href="#about" className="text-gray-600 hover:text-gray-900 transition-colors">Acerca de</a>
              <button
                onClick={() => setShowLoginModal(true)}
                className="bg-yellow-400 text-gray-900 px-6 py-2 rounded-lg font-semibold hover:bg-yellow-500 transition-colors shadow-md"
              >
                Iniciar Sesión
              </button>
            </nav>
            <button
              onClick={() => setShowLoginModal(true)}
              className="md:hidden bg-yellow-400 text-gray-900 px-4 py-2 rounded-lg font-semibold hover:bg-yellow-500 transition-colors shadow-md"
            >
              Login
            </button>
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


            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={() => setShowLoginModal(true)}
                className="bg-yellow-400 text-gray-900 px-6 sm:px-8 py-3 rounded-lg font-semibold hover:bg-yellow-500 transition-colors text-center shadow-md"
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

          {/* Right Side - Video */}
          <div className="hidden lg:block relative">
            <div className="relative bg-white rounded-3xl overflow-hidden h-full min-h-[500px] flex items-center justify-center">
              <video
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover"
              >
                <source src="/public-img/worker1.mp4" type="video/mp4" />
              </video>
              {/* Overlay con gradiente difuminado en los bordes */}
              <div className="absolute inset-0 pointer-events-none"
                style={{
                  background: 'linear-gradient(to right, white 0%, transparent 15%, transparent 85%, white 100%), linear-gradient(to bottom, white 0%, transparent 10%, transparent 90%, white 100%)',
                  mixBlendMode: 'normal'
                }}
              ></div>
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
              <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-4" style={{ backgroundColor: 'rgba(93, 225, 229, 0.1)' }}>
                <svg className="w-6 h-6" style={{ color: '#5DE1E5' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

      {/* Modal de Login */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setShowLoginModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Iniciar Sesión</h3>
              <button
                onClick={() => {
                  setShowLoginModal(false);
                  setError('');
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="modal-username" className="block text-sm font-medium text-gray-700 mb-2">
                  Correo electrónico
                </label>
                <input
                  id="modal-username"
                  name="username"
                  type="text"
                  required
                  autoComplete="off"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent focus:ring-[#5DE1E5]"
                  placeholder="Correo electrónico"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="modal-password" className="block text-sm font-medium text-gray-700 mb-2">
                  Contraseña
                </label>
                <input
                  id="modal-password"
                  name="password"
                  type="password"
                  required
                  autoComplete="new-password"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent focus:ring-[#5DE1E5]"
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
                className="w-full text-white py-3 px-6 rounded-lg font-medium hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[#5DE1E5] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                style={{ backgroundColor: '#5DE1E5' }}
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
        </div>
      )}
    </div>
  );
}
