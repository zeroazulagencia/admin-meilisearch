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
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);
  const [emailSub, setEmailSub] = useState('');
  const [activeTab, setActiveTab] = useState<'select' | 'configure' | 'describe'>('configure');

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
    <div className="min-h-screen bg-white overflow-x-hidden">
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
              <a href="#activation" className="text-gray-600 hover:text-gray-900 transition-colors">Proceso</a>
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
                  const activationSection = document.getElementById('activation');
                  activationSection?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="bg-gray-200 text-gray-900 px-6 sm:px-8 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors text-center"
              >
                Ver Proceso
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

        {/* Sección 3: Proceso de Activación de Agentes */}
        <section id="activation" className="py-20 bg-gray-50 border-t border-gray-200 w-full relative" style={{ width: '100vw', marginLeft: 'calc(50% - 50vw)' }}>          
          {/* Contenedor principal del contenido */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
              {/* Icono redondo sobre fondo primary - mitad dentro mitad fuera */}
              <div className="flex justify-center relative z-20" style={{ marginTop: '-120px', paddingBottom: '60px' }}>
                <div className="w-20 h-20 rounded-full flex items-center justify-center shadow-lg" style={{ backgroundColor: '#5DE1E5' }}>
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
              </div>
              
              {/* Título */}
              <div className="text-center mb-8">
                <h2 className="font-raleway text-4xl font-bold text-gray-900 mb-6">
                  Pocos pasos para activar tus agentes digitales
                </h2>
                <p className="font-raleway text-lg text-gray-600 leading-relaxed max-w-3xl mx-auto mb-8">
                  Antes de integrar un agente, es esencial definir qué área de tu negocio necesita apoyo. Considera sus procesos, flujos de trabajo y objetivos estratégicos. Tus agentes aprenderán y se adaptarán según esos parámetros.
                </p>
              </div>

              {/* Tres Pasos como TABS */}
              <div className="flex flex-col sm:flex-row gap-4 mb-12 justify-center items-stretch">
                {/* Tab 1 - Seleccionar */}
                <button 
                  onClick={() => setActiveTab('select')}
                  className={`rounded-lg px-6 py-4 transition-all text-left flex items-center gap-3 flex-1 max-w-xs ${
                    activeTab === 'select' 
                      ? 'shadow-md' 
                      : 'bg-white border-2 border-gray-200 hover:border-[#5DE1E5]'
                  }`}
                  style={activeTab === 'select' ? { backgroundColor: '#5DE1E5' } : {}}
                >
                  <svg className={`w-6 h-6 flex-shrink-0 ${activeTab === 'select' ? 'text-gray-900' : ''}`} style={activeTab !== 'select' ? { color: '#5DE1E5' } : {}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className={`font-raleway font-semibold ${activeTab === 'select' ? 'text-gray-900' : 'text-gray-900'}`}>Selecciona tu tipo de agente</span>
                </button>

                {/* Tab 2 - Configurar (por defecto activo) */}
                <button 
                  onClick={() => setActiveTab('configure')}
                  className={`rounded-lg px-6 py-4 transition-all text-left flex items-center gap-3 flex-1 max-w-xs ${
                    activeTab === 'configure' 
                      ? 'shadow-md' 
                      : 'bg-white border-2 border-gray-200 hover:border-[#5DE1E5]'
                  }`}
                  style={activeTab === 'configure' ? { backgroundColor: '#5DE1E5' } : {}}
                >
                  <svg className={`w-6 h-6 flex-shrink-0 ${activeTab === 'configure' ? 'text-gray-900' : ''}`} style={activeTab !== 'configure' ? { color: '#5DE1E5' } : {}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span className={`font-raleway font-semibold ${activeTab === 'configure' ? 'text-gray-900' : 'text-gray-900'}`}>Configura y genera tareas</span>
                </button>

                {/* Tab 3 - Describir */}
                <button 
                  onClick={() => setActiveTab('describe')}
                  className={`rounded-lg px-6 py-4 transition-all text-left flex items-center gap-3 flex-1 max-w-xs ${
                    activeTab === 'describe' 
                      ? 'shadow-md' 
                      : 'bg-white border-2 border-gray-200 hover:border-[#5DE1E5]'
                  }`}
                  style={activeTab === 'describe' ? { backgroundColor: '#5DE1E5' } : {}}
                >
                  <svg className={`w-6 h-6 flex-shrink-0 ${activeTab === 'describe' ? 'text-gray-900' : ''}`} style={activeTab !== 'describe' ? { color: '#5DE1E5' } : {}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <span className={`font-raleway font-semibold ${activeTab === 'describe' ? 'text-gray-900' : 'text-gray-900'}`}>Describe tus objetivos</span>
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

              {/* Bloque de texto complementario - Moderno y llamativo - Solo mitad derecha */}
              <div className="bg-white rounded-2xl p-8 lg:p-12 border border-gray-200 shadow-xl relative overflow-visible">
                {/* Imagen worker2.png dentro del div (off canvas, mitad dentro mitad fuera) */}
                <div className="absolute left-0 top-1/2 -translate-y-1/2 hidden lg:block" style={{ zIndex: 20, left: '-150px' }}>
                  <img 
                    src="/public-img/worker2.png" 
                    alt="Worker" 
                    className="h-[420px] w-auto object-contain float-slow opacity-90"
                  />
                </div>
                
                {/* Contenedor que ocupa solo desde el centro hacia la derecha (65%) */}
                <div className="w-full lg:w-[65%] lg:ml-auto relative z-10">
                  {activeTab === 'select' && (
                    <>
                      <h3 className="font-raleway text-3xl lg:text-4xl font-bold text-gray-900 mb-6">
                        Selecciona el tipo de agente que mejor se adapte a tu negocio
                      </h3>
                      <p className="font-raleway text-xl text-gray-700 leading-relaxed mb-8">
                        Los agentes de <span className="font-bold">DWRKRS</span> están diseñados para resolver desafíos específicos. Elige entre agentes de atención al cliente, ventas automatizadas, operaciones o análisis de datos.
                      </p>
                      <div className="space-y-3">
                        <div className="flex items-start gap-3 group">
                          <div className="mt-2 flex-shrink-0 w-2 h-2 rounded-full bg-[#5DE1E5]"></div>
                          <p className="font-raleway text-lg text-gray-700 font-medium group-hover:text-[#5DE1E5] transition-colors">
                            Agentes de atención al cliente para respuestas inmediatas 24/7
                          </p>
                        </div>
                        <div className="flex items-start gap-3 group">
                          <div className="mt-2 flex-shrink-0 w-2 h-2 rounded-full bg-[#5DE1E5]"></div>
                          <p className="font-raleway text-lg text-gray-700 font-medium group-hover:text-[#5DE1E5] transition-colors">
                            Agentes de ventas para gestión de leads y conversiones
                          </p>
                        </div>
                        <div className="flex items-start gap-3 group">
                          <div className="mt-2 flex-shrink-0 w-2 h-2 rounded-full bg-[#5DE1E5]"></div>
                          <p className="font-raleway text-lg text-gray-700 font-medium group-hover:text-[#5DE1E5] transition-colors">
                            Agentes operativos para automatización de procesos internos
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                  
                  {activeTab === 'configure' && (
                    <>
                      <h3 className="font-raleway text-3xl lg:text-4xl font-bold text-gray-900 mb-6">
                        Desbloquea las funciones avanzadas que redefinen tu{' '}
                        <span className="relative">
                          <span className="text-[#5DE1E5]">operación con IA</span>
                          <span className="absolute bottom-0 left-0 right-0 h-2 bg-[#5DE1E5] opacity-20"></span>
                        </span>
                      </h3>
                      <p className="font-raleway text-xl text-gray-700 leading-relaxed mb-8">
                        Los agentes de <span className="font-bold">DWRKRS</span> se integran en decisiones críticas y tareas de alto impacto. A medida que aprenden, aumentan la transparencia operativa y reducen la fricción en tus procesos.
                      </p>
                      <div className="space-y-3">
                        <div className="flex items-start gap-3 group">
                          <div className="mt-2 flex-shrink-0 w-2 h-2 rounded-full bg-[#5DE1E5]"></div>
                          <p className="font-raleway text-lg text-gray-700 font-medium group-hover:text-[#5DE1E5] transition-colors">
                            Automatización sostenible y escalable
                          </p>
                        </div>
                        <div className="flex items-start gap-3 group">
                          <div className="mt-2 flex-shrink-0 w-2 h-2 rounded-full bg-[#5DE1E5]"></div>
                          <p className="font-raleway text-lg text-gray-700 font-medium group-hover:text-[#5DE1E5] transition-colors">
                            Coordinación inteligente entre equipos humanos y digitales
                          </p>
                        </div>
                        <div className="flex items-start gap-3 group">
                          <div className="mt-2 flex-shrink-0 w-2 h-2 rounded-full bg-[#5DE1E5]"></div>
                          <p className="font-raleway text-lg text-gray-700 font-medium group-hover:text-[#5DE1E5] transition-colors">
                            Análisis predictivo para decisiones basadas en datos
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                  
                  {activeTab === 'describe' && (
                    <>
                      <h3 className="font-raleway text-3xl lg:text-4xl font-bold text-gray-900 mb-6">
                        Define los objetivos y personalidad de tu agente digital
                      </h3>
                      <p className="font-raleway text-xl text-gray-700 leading-relaxed mb-8">
                        Los agentes de <span className="font-bold">DWRKRS</span> se adaptan al tono y metas de tu negocio. Personaliza su personalidad desde asistentes analíticos hasta creativos, cada uno aprende de tus datos y evoluciona con el uso.
                      </p>
                      <div className="space-y-3">
                        <div className="flex items-start gap-3 group">
                          <div className="mt-2 flex-shrink-0 w-2 h-2 rounded-full bg-[#5DE1E5]"></div>
                          <p className="font-raleway text-lg text-gray-700 font-medium group-hover:text-[#5DE1E5] transition-colors">
                            Personalización del tono de comunicación según tu marca
                          </p>
                        </div>
                        <div className="flex items-start gap-3 group">
                          <div className="mt-2 flex-shrink-0 w-2 h-2 rounded-full bg-[#5DE1E5]"></div>
                          <p className="font-raleway text-lg text-gray-700 font-medium group-hover:text-[#5DE1E5] transition-colors">
                            Configuración de objetivos específicos por área de negocio
                          </p>
                        </div>
                        <div className="flex items-start gap-3 group">
                          <div className="mt-2 flex-shrink-0 w-2 h-2 rounded-full bg-[#5DE1E5]"></div>
                          <p className="font-raleway text-lg text-gray-700 font-medium group-hover:text-[#5DE1E5] transition-colors">
                            Aprendizaje continuo basado en interacciones y resultados
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </section>

        {/* Sección 4: Tipos de Agentes Digitales */}
        <section id="agents-types" className="py-20 bg-white border-t border-gray-200">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="font-raleway text-4xl font-bold text-gray-900 mb-4">
                Explora los agentes digitales favoritos de las empresas
              </h2>
              <p className="font-raleway text-lg text-gray-600 leading-relaxed max-w-3xl mx-auto">
                Nuestros agentes se adaptan a diferentes necesidades: comunicación, marketing, análisis o gestión. Cada uno está diseñado para cumplir funciones específicas con precisión y escalabilidad.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Agente 1 */}
              <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm hover:shadow-lg transition-shadow">
                <div className="w-16 h-16 rounded-lg flex items-center justify-center mb-6" style={{ backgroundColor: 'rgba(93, 225, 229, 0.1)' }}>
                  <svg className="w-8 h-8" style={{ color: '#5DE1E5' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <h3 className="font-raleway text-2xl font-bold text-gray-900 mb-3">
                  Agente de Contenido y Comunicación
                </h3>
                <p className="font-raleway text-gray-600 leading-relaxed">
                  Redacta textos, responde consultas y mantiene una comunicación coherente con tu marca en todos los canales. Ideal para blogs, atención al cliente o contenido publicitario.
                </p>
              </div>

              {/* Agente 2 */}
              <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm hover:shadow-lg transition-shadow">
                <div className="w-16 h-16 rounded-lg flex items-center justify-center mb-6" style={{ backgroundColor: 'rgba(93, 225, 229, 0.1)' }}>
                  <svg className="w-8 h-8" style={{ color: '#5DE1E5' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="font-raleway text-2xl font-bold text-gray-900 mb-3">
                  Agente de Marketing Automatizado
                </h3>
                <p className="font-raleway text-gray-600 leading-relaxed">
                  Gestiona campañas, segmenta audiencias y envía comunicaciones personalizadas. Su análisis predictivo optimiza la inversión y mejora la conversión.
                </p>
              </div>

              {/* Agente 3 */}
              <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm hover:shadow-lg transition-shadow">
                <div className="w-16 h-16 rounded-lg flex items-center justify-center mb-6" style={{ backgroundColor: 'rgba(93, 225, 229, 0.1)' }}>
                  <svg className="w-8 h-8" style={{ color: '#5DE1E5' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="font-raleway text-2xl font-bold text-gray-900 mb-3">
                  Agente de Monitoreo y Reportes
                </h3>
                <p className="font-raleway text-gray-600 leading-relaxed">
                  Supervisa indicadores clave y genera informes visuales automáticos. Te mantiene informado con métricas en tiempo real.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Sección 5: Preguntas Frecuentes (FAQ) */}
        <section id="faq" className="py-20 bg-white border-t border-gray-200">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="font-raleway text-4xl font-bold text-gray-900 mb-4">
                Preguntas frecuentes sobre DWRKRS
              </h2>
              <p className="font-raleway text-lg text-gray-600 leading-relaxed">
                Nuestro servicio de agentes digitales está diseñado para facilitar tareas repetitivas, generar resultados medibles y escalar sin fricción. Aquí respondemos lo más común:
              </p>
            </div>

            <div className="space-y-4">
              {[
                {
                  q: '¿Puedo usar los agentes para proyectos con clientes?',
                  a: 'Sí, pueden integrarse en flujos operativos de terceros o actuar como soporte B2B.'
                },
                {
                  q: '¿Dónde se desarrollan los agentes?',
                  a: 'La arquitectura base se aloja en infraestructura cloud global, garantizando seguridad y cumplimiento normativo.'
                },
                {
                  q: '¿Qué incluyen las actualizaciones gratuitas?',
                  a: 'Mejoras de rendimiento, nuevos módulos de automatización y aprendizaje continuo de los agentes.'
                },
                {
                  q: '¿Puedo usar DWRKRS en proyectos open source?',
                  a: 'Sí, siempre que se respete la política de uso ético y los lineamientos de datos.'
                }
              ].map((faq, index) => (
                <div key={index} className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                  <button
                    onClick={() => setExpandedFAQ(expandedFAQ === index ? null : index)}
                    className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-100 transition-colors"
                  >
                    <span className="font-raleway font-semibold text-gray-900 pr-4">{faq.q}</span>
                    <svg 
                      className={`w-5 h-5 flex-shrink-0 transition-transform ${expandedFAQ === index ? 'rotate-45' : ''}`}
                      style={{ color: '#5DE1E5' }}
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </button>
                  {expandedFAQ === index && (
                    <div className="px-6 pb-4">
                      <p className="font-raleway text-gray-600">{faq.a}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Sección 6: Llamado a la Acción (CTA) */}
        <section id="cta" className="py-20 border-t border-gray-200" style={{ backgroundColor: '#5DE1E5' }}>
          <div className="max-w-4xl mx-auto text-center px-4">
            <h2 className="font-raleway text-4xl font-bold text-gray-900 mb-6">
              ¿Listo para conocer a tu primer agente digital?
            </h2>
            <p className="font-raleway text-lg text-gray-800 mb-8 leading-relaxed">
              Activa hoy mismo tu asistente digital y transforma la forma en que trabajas. Tu negocio puede operar 24/7 con inteligencia artificial personalizada.
            </p>
            <button
              onClick={() => setShowLoginModal(true)}
              className="bg-gray-900 text-white px-8 py-4 rounded-lg font-raleway font-semibold text-lg hover:bg-gray-800 transition-colors shadow-lg"
            >
              Comienza tu prueba gratuita
            </button>
            
            {/* Ilustración simplificada */}
            <div className="mt-12 flex justify-center">
              <div className="relative">
                <svg className="w-32 h-32" fill="none" viewBox="0 0 200 200">
                  {/* Usuario */}
                  <circle cx="100" cy="80" r="20" stroke="currentColor" strokeWidth="2" fill="none" style={{ color: '#0369a1' }} />
                  <path d="M60 140 Q100 120 140 140" stroke="currentColor" strokeWidth="2" fill="none" style={{ color: '#0369a1' }} />
                  {/* Sobre */}
                  <rect x="140" y="60" width="40" height="30" stroke="currentColor" strokeWidth="2" fill="none" style={{ color: '#0369a1' }} />
                  <path d="M140 60 L160 70 L180 60" stroke="currentColor" strokeWidth="2" fill="none" style={{ color: '#0369a1' }} />
                  {/* Mensajes */}
                  <circle cx="50" cy="80" r="8" fill="currentColor" style={{ color: '#0369a1' }} />
                  <circle cx="50" cy="105" r="8" fill="currentColor" style={{ color: '#0369a1' }} />
                  <circle cx="50" cy="130" r="8" fill="currentColor" style={{ color: '#0369a1' }} />
                </svg>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 mt-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            {/* Logo y Descripción */}
            <div className="col-span-1 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <a href="https://zeroazul.com/" target="_blank" rel="noopener noreferrer" className="font-raleway text-2xl font-bold hover:text-[#5DE1E5] transition-colors">
                  DWRKRS
                </a>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#5DE1E5' }}></span>
              </div>
              <p className="font-raleway text-sm text-gray-400 leading-relaxed">
                Agencia de empleados digitales que integra inteligencia artificial y automatización para optimizar procesos empresariales.
              </p>
            </div>

            {/* Compañía */}
            <div>
              <h4 className="font-raleway font-semibold text-white mb-4">Compañía</h4>
              <ul className="space-y-2">
                <li><a href="#" className="font-raleway text-sm text-gray-400 hover:text-white transition-colors">Sobre nosotros</a></li>
                <li><a href="#faq" className="font-raleway text-sm text-gray-400 hover:text-white transition-colors">Contacto</a></li>
                <li><a href="#faq" className="font-raleway text-sm text-gray-400 hover:text-white transition-colors">FAQ</a></li>
              </ul>
            </div>

            {/* Páginas */}
            <div>
              <h4 className="font-raleway font-semibold text-white mb-4">Páginas</h4>
              <ul className="space-y-2">
                <li><a href="#" className="font-raleway text-sm text-gray-400 hover:text-white transition-colors">Equipo</a></li>
                <li><a href="#" className="font-raleway text-sm text-gray-400 hover:text-white transition-colors">Carreras</a></li>
                <li><a href="#" className="font-raleway text-sm text-gray-400 hover:text-white transition-colors">Página 404</a></li>
              </ul>
            </div>

            {/* Suscripción */}
            <div>
              <h4 className="font-raleway font-semibold text-white mb-4">Suscripción</h4>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="Tu correo"
                  value={emailSub}
                  onChange={(e) => setEmailSub(e.target.value)}
                  className="flex-1 px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-400 font-raleway text-sm focus:outline-none focus:ring-2 focus:border-transparent"
                  style={{ '--tw-ring-color': '#5DE1E5' } as React.CSSProperties & { '--tw-ring-color': string }}
                />
                <button
                  onClick={() => {
                    if (emailSub) {
                      alert('Gracias por suscribirte!');
                      setEmailSub('');
                    }
                  }}
                  className="px-4 py-2 rounded-lg font-raleway font-semibold text-sm text-gray-900 hover:opacity-90 transition-all"
                  style={{ backgroundColor: '#5DE1E5' }}
                >
                  Suscribirme
                </button>
              </div>
            </div>
          </div>

          {/* Redes sociales */}
          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="font-raleway text-sm text-gray-400 mb-4 md:mb-0">
              © 2025 DWRKRS Zero Azul. Todos los derechos reservados.
            </p>
            <div className="flex gap-4">
              <a href="#" className="text-gray-400 hover:text-[#5DE1E5] transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>
              <a href="#" className="text-gray-400 hover:text-[#5DE1E5] transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
              <a href="#" className="text-gray-400 hover:text-[#5DE1E5] transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
              </a>
              <a href="#" className="text-gray-400 hover:text-[#5DE1E5] transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </a>
            </div>
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
