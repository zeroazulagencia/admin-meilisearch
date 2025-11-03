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
          <div className="inline-block animate-spin h-8 w-8 border-2 border-t-transparent rounded-full" style={{ borderColor: '#5DE1E5' }}></div>
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
                className="h-6 w-auto"
              />
            </div>
            <nav className="hidden md:flex space-x-8 items-center">
              <a href="#features" className="text-gray-600 hover:text-gray-900 transition-colors">Características</a>
              <a href="#about" className="text-gray-600 hover:text-gray-900 transition-colors">Acerca de</a>
              <button
                onClick={() => setShowLoginModal(true)}
                className="text-gray-900 px-6 py-2 rounded-lg font-semibold hover:opacity-90 transition-all shadow-md"
                style={{ backgroundColor: '#5DE1E5' }}
              >
                Iniciar Sesión
              </button>
            </nav>
            <button
              onClick={() => setShowLoginModal(true)}
              className="md:hidden text-gray-900 px-4 py-2 rounded-lg font-semibold hover:opacity-90 transition-all shadow-md"
              style={{ backgroundColor: '#5DE1E5' }}
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
                Unlock The Power of <span className="underline decoration-4" style={{ textDecorationColor: '#5DE1E5' }}>DWORKERS</span> AI
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
                className="text-gray-900 px-6 sm:px-8 py-3 rounded-lg font-semibold hover:opacity-90 transition-all text-center shadow-md"
                style={{ backgroundColor: '#5DE1E5' }}
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

        {/* Sección 3: Proceso de Activación de Agentes */}
        <section id="activation" className="py-20 bg-gray-50 border-t border-gray-200">
          <div className="max-w-5xl mx-auto">
            {/* Título */}
            <div className="text-center mb-8">
              <h2 className="font-raleway text-4xl font-bold text-gray-900 mb-6">
                Pocos pasos para activar tus agentes digitales
              </h2>
              <p className="font-raleway text-lg text-gray-600 leading-relaxed max-w-3xl mx-auto mb-8">
                Antes de integrar un agente, es esencial definir qué área de tu negocio necesita apoyo. Considera sus procesos, flujos de trabajo y objetivos estratégicos. Tus agentes aprenderán y se adaptarán según esos parámetros.
              </p>
            </div>

            {/* Tres Pasos como Botones Horizontales */}
            <div className="flex flex-col sm:flex-row gap-4 mb-12 justify-center items-stretch">
              {/* Paso 1 */}
              <button className="bg-white border-2 border-gray-200 rounded-lg px-6 py-4 hover:border-[#5DE1E5] transition-all text-left flex items-center gap-3 flex-1 max-w-xs">
                <svg className="w-6 h-6 flex-shrink-0" style={{ color: '#5DE1E5' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="font-raleway font-semibold text-gray-900">Selecciona tu tipo de agente</span>
              </button>

              {/* Paso 2 - Destacado */}
              <button className="rounded-lg px-6 py-4 transition-all text-left flex items-center gap-3 flex-1 max-w-xs shadow-md" style={{ backgroundColor: '#5DE1E5' }}>
                <svg className="w-6 h-6 flex-shrink-0 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="font-raleway font-semibold text-gray-900">Configura y genera tareas</span>
              </button>

              {/* Paso 3 */}
              <button className="bg-white border-2 border-gray-200 rounded-lg px-6 py-4 hover:border-[#5DE1E5] transition-all text-left flex items-center gap-3 flex-1 max-w-xs">
                <svg className="w-6 h-6 flex-shrink-0" style={{ color: '#5DE1E5' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span className="font-raleway font-semibold text-gray-900">Describe tus objetivos</span>
              </button>
            </div>

            {/* Descripción de los pasos */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <div className="text-center">
                <p className="font-raleway text-gray-600 text-sm">
                  Elige entre agentes de atención, ventas, operaciones o análisis. Cada uno está diseñado para resolver desafíos específicos.
                </p>
              </div>
              <div className="text-center">
                <p className="font-raleway text-gray-600 text-sm">
                  Define las funciones clave que el agente debe ejecutar. En minutos podrás verlos trabajando en tu flujo operativo.
                </p>
              </div>
              <div className="text-center">
                <p className="font-raleway text-gray-600 text-sm">
                  Ajusta la personalidad y propósito de tu agente según el tono y metas de tu negocio. Cada uno aprende y evoluciona con el uso.
                </p>
              </div>
            </div>

            {/* Bloque de texto complementario */}
            <div className="bg-gray-100 rounded-xl p-8 border border-gray-200">
              <h3 className="font-raleway text-2xl font-bold text-gray-900 mb-4">
                Desbloquea las funciones avanzadas que redefinen tu operación con IA
              </h3>
              <p className="font-raleway text-lg text-gray-600 leading-relaxed mb-6">
                Los agentes de DWRKRS se integran en decisiones críticas y tareas de alto impacto. A medida que aprenden, aumentan la transparencia operativa y reducen la fricción en tus procesos.
              </p>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <p className="font-raleway text-gray-700">Automatización sostenible y escalable</p>
                </div>
                <div className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <p className="font-raleway text-gray-700">Coordinación inteligente entre equipos humanos y digitales</p>
                </div>
                <div className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <p className="font-raleway text-gray-700">Análisis predictivo para decisiones basadas en datos</p>
                </div>
              </div>
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
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative" onClick={(e) => e.stopPropagation()}>
            {/* Imagen worker1b.png flotante */}
            <img 
              src="/public-img/worker1b.png" 
              alt="Worker" 
              className="absolute -top-12 w-48 h-48 object-contain float-slow"
              style={{ zIndex: 999, left: '-118px' }}
            />
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
                className="w-full text-gray-900 py-3 px-6 rounded-lg font-medium hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[#5DE1E5] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                style={{ backgroundColor: '#5DE1E5' }}
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <span className="inline-block animate-spin h-5 w-5 border-2 border-gray-900 border-t-transparent rounded-full mr-2"></span>
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
