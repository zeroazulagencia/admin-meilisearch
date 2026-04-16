'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import NoticeModal from '@/components/ui/NoticeModal';
import { findFirstAccessibleRoute } from '@/utils/permissions';

function ImageWithSkeleton({ 
  src, 
  alt, 
  className = '', 
  style = {},
  onLoad,
  showWhenVisible = true,
  animateWhenReady = false
}: { 
  src: string; 
  alt: string; 
  className?: string; 
  style?: React.CSSProperties;
  onLoad?: () => void;
  showWhenVisible?: boolean;
  animateWhenReady?: boolean;
}) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const imgRef = useRef<HTMLImageElement>(null);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (showWhenVisible === false) return;
    if (hasLoadedRef.current) {
      setImageLoaded(true);
      setShowSkeleton(false);
      return;
    }
    if (!hasLoadedRef.current) {
      setImageLoaded(false);
      setShowSkeleton(true);
    }
    const img = new Image();
    img.src = src;
    img.onload = () => {
      hasLoadedRef.current = true;
      setImageLoaded(true);
      setShowSkeleton(false);
      if (onLoad) onLoad();
    };
    img.onerror = () => {
      setImageLoaded(true);
      setShowSkeleton(false);
    };
  }, [src, onLoad, showWhenVisible]);

  const handleImageLoad = () => {
    hasLoadedRef.current = true;
    setShowSkeleton(false);
    setImageLoaded(true);
  };

  const shouldShowImage = imageLoaded && !showSkeleton;
  const shouldShowSpinner = showWhenVisible === false || showSkeleton;

  const containerClasses = className.includes('absolute') || className.includes('fixed') || className.includes('relative') 
    ? className 
    : `relative ${className}`;
  
  const imageClasses = className.split(' ').filter(cls => 
    !cls.includes('absolute') && 
    !cls.includes('fixed') && 
    !cls.includes('relative') &&
    !cls.includes('top-') &&
    !cls.includes('left-') &&
    !cls.includes('right-') &&
    !cls.includes('bottom-') &&
    !cls.includes('z-')
  ).join(' ');
  
  const finalImageClasses = imageClasses.trim();

  return (
    <div className={containerClasses} style={style}>
      {shouldShowSpinner && (
        <div 
          className="absolute inset-0 flex items-center justify-center z-10"
          style={{ aspectRatio: 'auto', backgroundColor: 'transparent' }}
        >
          <div className="inline-block animate-spin h-10 w-10 border-4 border-t-transparent rounded-full" style={{ borderColor: '#5DE1E5', borderRightColor: 'rgba(93, 225, 229, 0.3)', borderBottomColor: 'rgba(93, 225, 229, 0.3)', borderLeftColor: 'rgba(93, 225, 229, 0.3)' }}></div>
        </div>
      )}
      {(showWhenVisible !== false || imageLoaded) && (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          className={`${finalImageClasses} transition-opacity duration-300 ${shouldShowImage ? 'opacity-100' : 'opacity-0'}`}
          style={style}
          onLoad={handleImageLoad}
          onError={() => {
            setShowSkeleton(false);
            setImageLoaded(true);
          }}
          loading="eager"
        />
      )}
    </div>
  );
}

export default function Home() {
  const { isAuthenticated, handleLogin } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [contactForm, setContactForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [contactLoading, setContactLoading] = useState(false);
  const [contactError, setContactError] = useState('');
  const [alertModal, setAlertModal] = useState<{ isOpen: boolean; title?: string; message: string; type?: 'success' | 'error' | 'info' | 'warning' }>({ isOpen: false, message: '', type: 'info' });

  useEffect(() => {
    if (isAuthenticated) router.push('/dashboard');
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated && showLoginModal) {
      setTimeout(() => {
        const usernameInput = document.getElementById('modal-username') as HTMLInputElement;
        const passwordInput = document.getElementById('modal-password') as HTMLInputElement;
        if (usernameInput) { usernameInput.value = ''; usernameInput.setAttribute('autocomplete', 'off'); }
        if (passwordInput) { passwordInput.value = ''; passwordInput.setAttribute('autocomplete', 'new-password'); }
      }, 100);
    }
  }, [isAuthenticated, showLoginModal]);

  useEffect(() => {
    if (showContactModal) {
      setTimeout(() => {
        const nameInput = document.getElementById('contact-name') as HTMLInputElement;
        if (nameInput) nameInput.focus();
      }, 100);
    }
  }, [showContactModal]);

  useEffect(() => {
    const handleScroll = () => setShowBackToTop(window.scrollY > 300);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
      const permissionsWithType = { ...(data.user?.permissions || {}), type: data.user?.permissions?.type === 'admin' ? 'admin' : 'client' };
      localStorage.setItem('admin-authenticated', 'true');
      localStorage.setItem('admin-user', data.user?.email || '');
      localStorage.setItem('admin-login-time', new Date().toISOString());
      localStorage.setItem('admin-user-id', String(data.user?.id || ''));
      localStorage.setItem('admin-permissions', JSON.stringify(permissionsWithType));
      handleLogin(true);
      setShowLoginModal(false);
      setError('');
      const firstRoute = findFirstAccessibleRoute(data.user?.permissions || {});
      router.push(firstRoute || '/dashboard');
    } catch (err) {
      setError(`Error al iniciar sesion: ${err}`);
    }
    setLoading(false);
  };

  const validateContactForm = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!contactForm.name.trim()) { setContactError('El nombre es requerido'); return false; }
    if (!contactForm.email.trim() || !emailRegex.test(contactForm.email)) { setContactError('Ingresa un email valido'); return false; }
    if (!contactForm.phone.trim()) { setContactError('El telefono es requerido'); return false; }
    if (!contactForm.message.trim()) { setContactError('El mensaje es requerido'); return false; }
    return true;
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactError('');
    if (!validateContactForm()) return;
    setContactLoading(true);
    try {
      const browserData = {
        browser: navigator.userAgent.includes('Chrome') ? 'Chrome' : navigator.userAgent.includes('Firefox') ? 'Firefox' : navigator.userAgent.includes('Safari') ? 'Safari' : 'Otro',
        os: navigator.platform,
        screen: `${window.screen.width}x${window.screen.height}`,
        language: navigator.language
      };
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...contactForm, honeypot: (e.target as any).honeypot?.value || '', browserData })
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        setContactError(data.error || 'Error al enviar el mensaje.');
        setContactLoading(false);
        return;
      }
      setShowContactModal(false);
      setContactForm({ name: '', email: '', phone: '', message: '' });
      setContactLoading(false);
      setAlertModal({ isOpen: true, title: 'Mensaje enviado', message: 'Gracias por contactarnos. Te responderemos pronto.', type: 'success' });
    } catch (error) {
      setContactError('Error al enviar el mensaje.');
      setContactLoading(false);
    }
  };

  const faqs = [
    { q: 'Que hace exactamente un agente de inteligencia artificial?', a: 'Un agente de IA es un programa autonomo que utiliza inteligencia artificial para ejecutar tareas especificas. Puede conversar con clientes, procesar informacion, tomar decisiones basadas en reglas, consultar sistemas y ejecutar acciones dentro de tus flujos de trabajo existentes.' },
    { q: 'Que tipo de tareas repetitivas puede asumir un agente?', a: 'Los agentes pueden asumir atencion al cliente, calificacion de prospectos, seguimiento de procesos, registro de datos, consultas a bases de datos, generacion de reportes, monitoreo de indicadores, coordinacion de tareas entre equipos y cualquier proceso que siga patrones identificables.' },
    { q: 'Se pueden contratar agentes para procesos especificos de mi empresa?', a: 'Si. Diseamos agentes a medida para las necesidades de tu operacion. No trabajamos con asistentes genericos, sino con agentes especializados en funciones concretas de tu negocio, alineados con tus reglas y flujos.' },
    { q: 'Los agentes se integran con nuestros sistemas actuales?', a: 'Si. Nuestros agentes se conectan con APIs, bases de datos, ERPs, CRMs, herramientas internas, plataformas de produccion, inventario y cualquier sistema que tenga una interfaz de comunicacion disponible.' },
    { q: 'Cuanto tiempo toma implementar un agente IA?', a: 'El tiempo varia segun la complejidad. Un agente de atencion basico puede estar operativo en 2 a 4 semanas. Agentes mas complejos que requieren integracion profunda con multiples sistemas pueden tomar de 6 a 12 semanas.' },
    { q: 'Que seguridad y control tienen los agentes dentro de la operacion?', a: 'Implementamos encriptacion de datos, control de acceso por roles, logs de actividad detallados y auditorias periodicas. Los agentes operan dentro de parametros definidos y toda su actividad es monitoreable y auditable.' }
  ];

  const stats = [
    { value: '85%', label: 'Menos trabajo manual' },
    { value: '24/7', label: 'Operacion continua' },
    { value: '45%', label: 'Reduccion de costos operativos' }
  ];

  const portfolioCards = [
    { category: 'OPERACION', title: 'Operador de Procesos Complejos', description: 'Contrata un agente que coordina tareas de varias etapas, valida condiciones, mueve procesos entre areas y reduce bloqueos operativos que frenan la ejecucion diaria.' },
    { category: 'PRODUCCION', title: 'Gestor de Planta de Produccion', description: 'Un agente que ayuda a monitorear avances, registrar novedades, detectar desvios y mantener visibilidad constante sobre la operacion de planta.' },
    { category: 'ABASTECIMIENTO', title: 'Previsor de Compras a Proveedores', description: 'Analiza consumos, inventario e historicos para anticipar compras, evitar quiebres y reducir fricciones entre demanda, stock y abastecimiento.' },
    { category: 'ATENCION', title: 'Asistente de WhatsApp 24/7', description: 'Atiende clientes, responde preguntas, califica oportunidades, hace seguimiento y mantiene la conversacion activa sin pausas ni horarios limitados.' },
    { category: 'AUTOMATIZACION', title: 'Ejecutor de Tareas Repetitivas', description: 'Se encarga de actividades operativas y administrativas que consumen tiempo, como actualizaciones, registros, validaciones y movimientos entre sistemas.' },
    { category: 'DATOS', title: 'Analista de Datos Operativos', description: 'Convierte grandes volumenes de informacion en alertas, reportes y senales utiles para detectar problemas, seguir indicadores y tomar mejores decisiones.' }
  ];

  const textHighlights = ['AUTOMATIZACION', 'OPERACION 24/7', 'MENOS CUELLOS DE BOTELLA'];

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xl text-gray-900">WORKERS</span>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#5DE1E5' }}></span>
            </div>
            <nav className="hidden md:flex space-x-8 items-center">
              <a href="#metodologia" className="text-gray-600 hover:text-gray-900 transition-colors">Metodologia</a>
              <a href="#portafolio" className="text-gray-600 hover:text-gray-900 transition-colors">Portafolio</a>
              <a href="#faq" className="text-gray-600 hover:text-gray-900 transition-colors">FAQ</a>
              <button onClick={() => setShowContactModal(true)} className="text-gray-900 px-6 py-2 rounded-lg font-semibold hover:opacity-90 transition-all shadow-md" style={{ backgroundColor: '#5DE1E5' }}>Agendar Demo</button>
              <button onClick={() => setShowLoginModal(true)} className="text-white px-6 py-2 rounded-lg font-semibold hover:opacity-90 transition-all shadow-md" style={{ backgroundColor: '#000000' }}>Login</button>
            </nav>
            <button onClick={() => setShowContactModal(true)} className="md:hidden text-gray-900 px-4 py-2 rounded-lg font-semibold hover:opacity-90 transition-all shadow-md mr-2" style={{ backgroundColor: '#5DE1E5' }}>Demo</button>
            <button onClick={() => setShowLoginModal(true)} className="md:hidden text-white px-4 py-2 rounded-lg font-semibold hover:opacity-90 transition-all" style={{ backgroundColor: '#000000' }}>Login</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center min-h-[calc(100vh-4rem)] py-8 lg:py-12">
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 leading-tight">
                Contrata Agentes <span className="border-b-4 border-[#5DE1E5]">IA y Libera</span> tu Operacion
              </h1>
              <p className="text-xl sm:text-2xl font-semibold text-gray-800">Contrata agentes y libera tu operacion de tareas repetitivas</p>
              <p className="text-base sm:text-lg text-gray-600 leading-relaxed">Escala tu empresa con agentes de inteligencia artificial que ejecutan tareas, sostienen procesos, reducen cuellos de botellas y mantienen tu operacion activa mientras tu equipo se concentra en lo que realmente mueve el negocio.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {textHighlights.map((text, i) => (
                <span key={i} className="px-3 py-1 text-sm font-medium rounded-full border-2" style={{ borderColor: '#5DE1E5', color: '#5DE1E5' }}>{text}</span>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <button onClick={() => setShowContactModal(true)} className="text-gray-900 px-6 sm:px-8 py-3 rounded-lg font-semibold hover:opacity-90 transition-all text-center shadow-md" style={{ backgroundColor: '#5DE1E5' }}>Agendar Demo</button>
              <a href="#metodologia" className="bg-gray-900 text-white px-6 sm:px-8 py-3 rounded-lg font-semibold hover:bg-gray-800 transition-colors text-center">Saber mas</a>
            </div>
          </div>
          <div className="hidden lg:block relative">
            <div className="relative bg-white rounded-3xl overflow-hidden h-full min-h-[500px] flex items-center justify-center">
              <video src="/public-img/worker1.mp4" className="w-full h-full object-cover" autoPlay loop muted playsInline />
              <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to right, white 0%, transparent 15%, transparent 85%, white 100%), linear-gradient(to bottom, white 0%, transparent 10%, transparent 90%, white 100%)' }}></div>
              <div className="absolute bottom-8 right-8 bg-white rounded-xl shadow-2xl p-4 border border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">EFICIENCIA</p>
                <p className="text-3xl font-bold" style={{ color: '#5DE1E5' }}>+300%</p>
              </div>
            </div>
          </div>
        </div>

        <section id="aliado" className="py-20 bg-gray-50 border-t border-gray-200">
          <div className="max-w-full mx-auto text-center px-4 sm:px-6 lg:px-8">
            <p className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: '#5DE1E5' }}>TU ALIADO</p>
            <p className="text-lg text-gray-600 mb-12 max-w-2xl mx-auto">Creamos agentes de inteligencia artificial para empresas que necesitan liberar tiempo, reducir friccion operativa y mantener procesos en movimiento sin depender de seguimiento manual en cada paso.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-3">Lo que nos diferencia</h3>
                <p className="text-gray-600">No solo desarrollamos asistentes sueltos. Disenamos agentes especializados que ejecutan funciones reales dentro de tu operacion, coordinan tareas, consultan informacion y ayudan a que el trabajo avance sin detenerse.</p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-3">Integramos agentes a tu realidad operativa</h3>
                <p className="text-gray-600">Nuestros agentes pueden conectarse con APIs, bases de datos, ERPs, CRMs, herramientas internas, plataformas de produccion, inventario y atencion para operar dentro de tus flujos actuales.</p>
              </div>
            </div>
            <button onClick={() => setShowContactModal(true)} className="mt-10 text-gray-900 px-8 py-3 rounded-lg font-semibold hover:opacity-90 transition-all shadow-md" style={{ backgroundColor: '#5DE1E5' }}>Agendar Demo</button>
          </div>
        </section>

        <section id="portafolio" className="py-20 bg-white border-t border-gray-200">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <p className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: '#5DE1E5' }}>PORTAFOLIO DE SOLUCIONES</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Nuestros Agentes IA</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {portfolioCards.map((card, i) => (
                <div key={i} className="bg-gray-50 rounded-xl p-6 border border-gray-100 hover:shadow-lg transition-shadow">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#5DE1E5' }}>
                      {card.category === 'OPERACION' && (
                        <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                      )}
                      {card.category === 'PRODUCCION' && (
                        <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                      )}
                      {card.category === 'ABASTECIMIENTO' && (
                        <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                      )}
                      {card.category === 'ATENCION' && (
                        <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                      )}
                      {card.category === 'AUTOMATIZACION' && (
                        <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      )}
                      {card.category === 'DATOS' && (
                        <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                      )}
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#5DE1E5' }}>{card.category}</p>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3">{card.title}</h3>
                  <p className="text-sm text-gray-600">{card.description}</p>
                </div>
              ))}
            </div>
            <div className="text-center mt-10">
              <button onClick={() => setShowContactModal(true)} className="text-gray-900 px-8 py-3 rounded-lg font-semibold hover:opacity-90 transition-all shadow-md" style={{ backgroundColor: '#5DE1E5' }}>Hablemos de tu proyecto</button>
            </div>
          </div>
        </section>
      </main>

      <section className="py-16 border-t border-gray-200" style={{ backgroundColor: '#5DE1E5' }}>
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <h3 className="text-center text-xl font-semibold text-gray-900 mb-10">El impacto de nuestros agentes en cifras</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            {stats.map((stat, i) => (
              <div key={i}>
                <p className="text-5xl font-bold text-gray-900 mb-2">{stat.value}</p>
                <p className="text-gray-800 font-medium">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-gray-50 border-t border-gray-200">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: '#5DE1E5' }}>IMPACTO REAL</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Libera a tu equipo para lo importante</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">Cuando contratas agentes de inteligencia artificial, tu empresa deja de gastar energia en tareas repetitivas y empieza a enfocarse mas en control, estrategia, servicio y crecimiento.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 mb-3">Menos cuellos de botella</h3>
              <p className="text-gray-600">Los agentes sostienen procesos, reducen esperas innecesarias y ayudan a que la operacion siga avanzando sin tantos puntos de friccion.</p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 mb-3">Mas tiempo para el equipo</h3>
              <p className="text-gray-600">Al sacar de encima tareas manuales y repetitivas, las personas pueden enfocarse en supervisar, resolver y aportar mas valor.</p>
            </div>
          </div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <section id="metodologia" className="py-20 bg-white border-t border-gray-200">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <p className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: '#5DE1E5' }}>METODOLOGIA</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Contrata agentes, elimina friccion</h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">Diseamos agentes de inteligencia artificial para que tu empresa avance con menos tareas repetitivas, menos cuellos de botellas y mas capacidad operativa.</p>
            </div>
            <div className="space-y-6">
              <div className="flex gap-4 items-start p-6 bg-gray-50 rounded-xl">
                <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg shrink-0" style={{ backgroundColor: '#5DE1E5', color: '#000' }}>1</div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Entendemos tu operacion</h3>
                  <p className="text-gray-600">Revisamos como fluye hoy el trabajo, donde se acumulan tareas, que procesos se frenan y que actividades estan consumiendo tiempo de mas.</p>
                </div>
              </div>
              <div className="flex gap-4 items-start p-6 bg-gray-50 rounded-xl">
                <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg shrink-0" style={{ backgroundColor: '#5DE1E5', color: '#000' }}>2</div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Disenamos agentes a medida</h3>
                  <p className="text-gray-600">Creamos agentes que responden a funciones concretas dentro de tu negocio, alineados con tus reglas, tus equipos y tus sistemas.</p>
                </div>
              </div>
              <div className="flex gap-4 items-start p-6 bg-gray-50 rounded-xl">
                <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg shrink-0" style={{ backgroundColor: '#5DE1E5', color: '#000' }}>3</div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Ajustamos y optimizamos</h3>
                  <p className="text-gray-600">Medimos resultados, afinamos comportamientos y fortalecemos el desempeno para que cada agente aporte valor real en la operacion.</p>
                </div>
              </div>
            </div>
            <div className="text-center mt-10">
              <button onClick={() => setShowContactModal(true)} className="text-gray-900 px-8 py-3 rounded-lg font-semibold hover:opacity-90 transition-all shadow-md" style={{ backgroundColor: '#5DE1E5' }}>Agendar Demo</button>
            </div>
          </div>
        </section>

        <section id="faq" className="py-20 bg-white border-t border-gray-200">
          <div className="max-w-3xl mx-auto px-4">
            <div className="text-center mb-12">
              <p className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: '#5DE1E5' }}>FAQ</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Preguntas Frecuentes</h2>
            </div>
            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <div key={index} className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                  <button onClick={() => setExpandedFAQ(expandedFAQ === index ? null : index)} className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-100 transition-colors">
                    <span className="font-semibold text-gray-900 pr-4">{faq.q}</span>
                    <svg className={`w-5 h-5 flex-shrink-0 transition-transform ${expandedFAQ === index ? 'rotate-45' : ''}`} style={{ color: '#5DE1E5' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </button>
                  {expandedFAQ === index && <div className="px-6 pb-4"><p className="text-gray-600">{faq.a}</p></div>}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 border-t border-gray-200 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full border-4 border-gray-900"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full border-4 border-gray-900"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full border-4 border-gray-900"></div>
          </div>
          <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">Listo para contratar agentes para tu empresa?</h2>
            <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">Agenda una demo y descubre como liberar a tu equipo de tareas repetitivas, reducir cuellos de botellas y operar con mas capacidad.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button onClick={() => setShowContactModal(true)} className="text-white px-8 py-4 rounded-lg font-semibold hover:opacity-90 transition-all shadow-lg text-lg" style={{ backgroundColor: '#5DE1E5' }}>Agendar Demo Gratuita</button>
              <button onClick={() => setShowContactModal(true)} className="bg-gray-900 text-white px-8 py-4 rounded-lg font-semibold hover:bg-gray-800 transition-colors text-lg">Contactar Ventas</button>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div>
              <span className="font-bold text-2xl" style={{ color: '#5DE1E5' }}>WORKERS</span>
              <p className="text-gray-400 mt-2 max-w-md">Agencia de agentes de inteligencia artificial para empresas. Contrata agentes especializados para automatizar tareas, destrabar procesos y escalar tu operacion con mas eficiencia.</p>
            </div>
            <div className="text-center md:text-right">
              <div className="bg-gray-800 rounded-xl p-4 inline-block">
                <p className="text-xs text-gray-400 uppercase tracking-wider">Agente IA Operativo</p>
                <p className="text-sm font-semibold mt-1 flex items-center gap-2 justify-center md:justify-end">
                  Status: <span className="text-green-400 flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                    ACTIVE 24/7
                  </span>
                </p>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-gray-400">© 2026 Workers. Una empresa de <a href="https://zeroazul.com" target="_blank" rel="noopener noreferrer" className="text-[#5DE1E5] hover:underline">Zero Azul</a>.</p>
            <div className="flex gap-4 mt-4 md:mt-0">
              <a href="https://www.facebook.com/zeroazulagencia" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#5DE1E5] transition-colors"><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg></a>
              <a href="https://www.instagram.com/zeroazulagencia/" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#5DE1E5] transition-colors"><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg></a>
              <a href="https://www.linkedin.com/company/22294464" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#5DE1E5] transition-colors"><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg></a>
            </div>
          </div>
        </div>
      </footer>

      {showLoginModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setShowLoginModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Iniciar Sesion</h3>
              <button onClick={() => { setShowLoginModal(false); setError(''); }} className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Correo electronico</label>
                <input id="modal-username" type="text" required autoComplete="off" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent focus:ring-[#5DE1E5]" placeholder="Correo electronico" value={username} onChange={(e) => setUsername(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Contrasena</label>
                <input id="modal-password" type="password" required autoComplete="new-password" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent focus:ring-[#5DE1E5]" placeholder="Contrasena" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              {error && <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</div>}
              <button type="submit" disabled={loading} className="w-full text-gray-900 py-3 px-6 rounded-lg font-medium hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[#5DE1E5] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all" style={{ backgroundColor: '#5DE1E5' }}>
                {loading ? <span className="flex items-center justify-center"><span className="inline-block animate-spin h-5 w-5 border-2 border-gray-900 border-t-transparent rounded-full mr-2"></span>Iniciando sesion...</span> : 'Iniciar Sesion'}
              </button>
            </form>
          </div>
        </div>
      )}

      {showContactModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto" onClick={() => setShowContactModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full my-8 relative" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 lg:p-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900">Contactanos</h3>
                <button onClick={() => { setShowContactModal(false); setContactError(''); setContactForm({ name: '', email: '', phone: '', message: '' }); }} className="text-gray-400 hover:text-gray-600 transition-colors p-1">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <form onSubmit={handleContactSubmit} className="space-y-4">
                <div style={{ position: 'absolute', left: '-9999px', opacity: 0, pointerEvents: 'none' }}>
                  <label>No llenar este campo</label>
                  <input id="honeypot" name="honeypot" type="text" tabIndex={-1} autoComplete="off" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nombre <span className="text-red-500">*</span></label>
                  <input id="contact-name" name="name" type="text" required className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent focus:ring-[#5DE1E5]" placeholder="Tu nombre completo" value={contactForm.name} onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email <span className="text-red-500">*</span></label>
                  <input id="contact-email" name="email" type="email" required className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent focus:ring-[#5DE1E5]" placeholder="tu@email.com" value={contactForm.email} onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Telefono <span className="text-red-500">*</span></label>
                  <input id="contact-phone" name="phone" type="tel" required className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent focus:ring-[#5DE1E5]" placeholder="+57 300 123 4567" value={contactForm.phone} onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Mensaje <span className="text-red-500">*</span></label>
                  <textarea id="contact-message" name="message" required rows={4} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent focus:ring-[#5DE1E5] resize-none" placeholder="Cuentanos sobre tu proyecto..." value={contactForm.message} onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })} />
                </div>
                {contactError && <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{contactError}</div>}
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button type="button" onClick={() => { setShowContactModal(false); setContactError(''); setContactForm({ name: '', email: '', phone: '', message: '' }); }} className="flex-1 bg-gray-200 text-gray-900 py-3 px-6 rounded-lg font-medium hover:bg-gray-300 transition-colors">Cerrar</button>
                  <button type="submit" disabled={contactLoading} className="flex-1 text-gray-900 py-3 px-6 rounded-lg font-medium hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[#5DE1E5] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all" style={{ backgroundColor: '#5DE1E5' }}>
                    {contactLoading ? <span className="flex items-center justify-center"><span className="inline-block animate-spin h-5 w-5 border-2 border-gray-900 border-t-transparent rounded-full mr-2"></span>Enviando...</span> : 'Enviar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <NoticeModal isOpen={alertModal.isOpen} onClose={() => setAlertModal({ ...alertModal, isOpen: false })} title={alertModal.title} message={alertModal.message} type={alertModal.type} />

      <a href="https://wa.me/573195947797" target="_blank" rel="noopener noreferrer" className="fixed bottom-6 right-6 w-14 h-14 bg-green-500 rounded-full flex items-center justify-center shadow-lg hover:bg-green-600 transition-colors z-50" aria-label="Contactar por WhatsApp">
        <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
      </a>

      {showBackToTop && (
        <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="fixed bottom-6 left-6 w-12 h-12 bg-gray-900 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-gray-800 transition-colors z-50" aria-label="Volver arriba">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
        </button>
      )}
    </div>
  );
}
