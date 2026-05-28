'use client';

import { useMemo, useState } from 'react';
import ReactFlow, { Background, Controls } from 'reactflow';
import 'reactflow/dist/style.css';
import NoticeModal from '@/components/ui/NoticeModal';

type AlertModal = {
  isOpen: boolean;
  title?: string;
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
};

export default function DataPrepPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);
  const [contactForm, setContactForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [contactLoading, setContactLoading] = useState(false);
  const [contactError, setContactError] = useState('');
  const [alertModal, setAlertModal] = useState<AlertModal>({ isOpen: false, message: '', type: 'info' });

  const nodes = useMemo(
    () => [
      {
        id: 'source',
        position: { x: 0, y: 40 },
        data: {
          label: (
            <div className="text-left">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#5DE1E5' }}>Origen</p>
              <p className="text-sm font-bold text-gray-900">Fuentes conectadas</p>
              <p className="text-xs text-gray-500">Apps, APIs, bases de datos</p>
            </div>
          )
        },
        style: {
          border: '1px solid #e5e7eb',
          borderRadius: 16,
          padding: 14,
          background: '#ffffff',
          width: 210
        }
      },
      {
        id: 'clean',
        position: { x: 260, y: 0 },
        data: {
          label: (
            <div className="text-left">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#5DE1E5' }}>Transformar</p>
              <p className="text-sm font-bold text-gray-900">Limpieza inteligente</p>
              <p className="text-xs text-gray-500">Normaliza y corrige datos</p>
            </div>
          )
        },
        style: {
          border: '1px solid #e5e7eb',
          borderRadius: 16,
          padding: 14,
          background: '#ffffff',
          width: 210
        }
      },
      {
        id: 'enrich',
        position: { x: 520, y: 80 },
        data: {
          label: (
            <div className="text-left">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#5DE1E5' }}>Enriquecer</p>
              <p className="text-sm font-bold text-gray-900">Contexto y reglas</p>
              <p className="text-xs text-gray-500">Cruza y completa campos</p>
            </div>
          )
        },
        style: {
          border: '1px solid #e5e7eb',
          borderRadius: 16,
          padding: 14,
          background: '#ffffff',
          width: 210
        }
      },
      {
        id: 'dest',
        position: { x: 780, y: 40 },
        data: {
          label: (
            <div className="text-left">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#5DE1E5' }}>Destino</p>
              <p className="text-sm font-bold text-gray-900">Exportacion</p>
              <p className="text-xs text-gray-500">Warehouses, BI, apps</p>
            </div>
          )
        },
        style: {
          border: '1px solid #e5e7eb',
          borderRadius: 16,
          padding: 14,
          background: '#ffffff',
          width: 210
        }
      }
    ],
    []
  );

  const edges = useMemo(
    () => [
      { id: 'e1-2', source: 'source', target: 'clean', animated: true, style: { stroke: '#5DE1E5' } },
      { id: 'e2-3', source: 'clean', target: 'enrich', animated: true, style: { stroke: '#5DE1E5' } },
      { id: 'e3-4', source: 'enrich', target: 'dest', animated: true, style: { stroke: '#5DE1E5' } }
    ],
    []
  );

  const faqs = [
    { q: 'Que es DataPrep para Workers?', a: 'Es un entorno visual para preparar datos sin codigo. Conecta fuentes, transforma informacion y exporta resultados con pipelines claros.' },
    { q: 'Necesito un equipo tecnico para usarlo?', a: 'No. El flujo es no-code y guiado. Los equipos pueden crear pipelines sin depender de desarrollo.' },
    { q: 'Que tipo de datos puedo procesar?', a: 'Archivos, APIs, bases de datos y herramientas de negocio. Diseamos conectores segun tu operacion.' },
    { q: 'Puedo programar ejecuciones automaticas?', a: 'Si. Puedes definir horarios y reglas de ejecucion para mantener datos actualizados.' }
  ];

  const capabilities = [
    { title: 'Conectar fuentes', desc: 'Integra datos desde APIs, CRMs, ERPs, archivos y data warehouses.' },
    { title: 'Transformar y limpiar', desc: 'Normaliza formatos, corrige valores y elimina ruido operativo.' },
    { title: 'Enriquecer datos', desc: 'Cruza fuentes y agrega contexto para mejorar calidad y uso.' },
    { title: 'Exportar resultados', desc: 'Entrega datasets limpios en herramientas BI y apps de negocio.' },
    { title: 'Automatizar flujo', desc: 'Define reglas y calendarios para ejecucion continua.' },
    { title: 'Monitorear salud', desc: 'Seguimiento del estado de pipelines con alertas y reportes.' }
  ];

  const audiences = [
    { title: 'Analistas de datos', desc: 'Preparan datasets consistentes para analisis y dashboards.' },
    { title: 'Equipos de negocio', desc: 'Acceden a informacion confiable sin depender de desarrollos.' },
    { title: 'Ingenieria', desc: 'Orquesta pipelines estables con monitoreo y control.' },
    { title: 'Data science', desc: 'Acelera el entrenamiento y experimentacion con datos limpios.' }
  ];

  const stats = [
    { value: 'No-code', label: 'Pipelines visuales claros' },
    { value: '24/7', label: 'Flujos automatizados' },
    { value: '0', label: 'Dependencia de tareas manuales' }
  ];

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
      localStorage.setItem('admin-authenticated', 'true');
      localStorage.setItem('admin-user', data.user?.email || '');
      localStorage.setItem('admin-login-time', new Date().toISOString());
      localStorage.setItem('admin-user-id', String(data.user?.id || ''));
      localStorage.setItem('admin-permissions', JSON.stringify(data.user?.permissions || {}));
      setShowLoginModal(false);
      setError('');
      window.location.href = '/dashboard';
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
              <a href="#flujo" className="text-gray-600 hover:text-gray-900 transition-colors">Flujo</a>
              <a href="#capacidades" className="text-gray-600 hover:text-gray-900 transition-colors">Capacidades</a>
              <a href="#beneficios" className="text-gray-600 hover:text-gray-900 transition-colors">Beneficios</a>
              <a href="#audiencias" className="text-gray-600 hover:text-gray-900 transition-colors">Para quien es</a>
              <button onClick={() => setShowContactModal(true)} className="text-gray-900 px-6 py-2 rounded-lg font-semibold hover:opacity-90 transition-all shadow-md" style={{ backgroundColor: '#5DE1E5' }}>Agendar Demo</button>
              <button onClick={() => setShowLoginModal(true)} className="text-white px-6 py-2 rounded-lg font-semibold hover:opacity-90 transition-all shadow-md" style={{ backgroundColor: '#000000' }}>Login</button>
            </nav>
            <button onClick={() => setShowContactModal(true)} className="md:hidden text-gray-900 px-4 py-2 rounded-lg font-semibold hover:opacity-90 transition-all shadow-md mr-2" style={{ backgroundColor: '#5DE1E5' }}>Demo</button>
            <button onClick={() => setShowLoginModal(true)} className="md:hidden text-white px-4 py-2 rounded-lg font-semibold hover:opacity-90 transition-all" style={{ backgroundColor: '#000000' }}>Login</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center min-h-[calc(100vh-4rem)] py-12">
          <div className="space-y-8">
            <div className="space-y-4">
              <p className="text-sm font-semibold uppercase tracking-widest" style={{ color: '#5DE1E5' }}>DataPrep para Workers</p>
              <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 leading-tight">
                Prepara datos con pipelines visuales sin codigo
              </h1>
              <p className="text-lg text-gray-600 leading-relaxed">
                Unifica, limpia y transforma datos desde multiples fuentes en un solo flujo visual. Diseñado para equipos que necesitan orden, velocidad y trazabilidad sin depender de tareas manuales.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {['ETL VISUAL', 'AUTOMATIZACION', 'DATOS CONFIABLES'].map((text) => (
                <span key={text} className="px-3 py-1 text-sm font-medium rounded-full border-2" style={{ borderColor: '#5DE1E5', color: '#5DE1E5' }}>{text}</span>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <button onClick={() => setShowContactModal(true)} className="text-gray-900 px-6 sm:px-8 py-3 rounded-lg font-semibold hover:opacity-90 transition-all text-center shadow-md" style={{ backgroundColor: '#5DE1E5' }}>Agendar Demo</button>
              <a href="#flujo" className="bg-gray-900 text-white px-6 sm:px-8 py-3 rounded-lg font-semibold hover:bg-gray-800 transition-colors text-center">Ver flujo</a>
            </div>
          </div>
          <div className="relative">
            <div className="absolute inset-0 rounded-3xl" style={{ background: 'linear-gradient(140deg, #f3f4f6 0%, #ffffff 45%, #f3f4f6 100%)' }}></div>
            <div className="relative rounded-3xl border border-gray-200 bg-white/90 backdrop-blur p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">Pipeline activo</p>
                  <p className="text-lg font-bold text-gray-900">Calidad y trazabilidad</p>
                </div>
                <div className="px-3 py-1 text-xs font-semibold rounded-full" style={{ backgroundColor: 'rgba(93, 225, 229, 0.2)', color: '#0f766e' }}>OK</div>
              </div>
              <div className="h-[320px] rounded-2xl border border-gray-100">
                <ReactFlow nodes={nodes} edges={edges} fitView={true} nodesConnectable={false} nodesDraggable={false} zoomOnScroll={false} panOnScroll={false} panOnDrag={false}>
                  <Background color="#e5e7eb" gap={24} />
                  <Controls showInteractive={false} />
                </ReactFlow>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4 text-xs text-gray-600">
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                  <p className="font-semibold text-gray-900">Estado del flujo</p>
                  <p>Actualizado hace 2 min</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                  <p className="font-semibold text-gray-900">Ejecuciones</p>
                  <p>Programado cada 2 horas</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <section id="flujo" className="py-20 bg-gray-50 border-t border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: '#5DE1E5' }}>Flujo visual</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Construye pipelines en minutos</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">Orquesta cada paso del dato con claridad: desde la fuente hasta el destino final, con transformaciones visibles y reglas que puedes auditar.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { step: '1', title: 'Conecta', desc: 'Integra todas tus fuentes en un solo flujo.' },
              { step: '2', title: 'Transforma', desc: 'Normaliza y limpia sin formulas complejas.' },
              { step: '3', title: 'Entrega', desc: 'Exporta datos listos para tomar decisiones.' }
            ].map((item) => (
              <div key={item.step} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 text-center">
                <div className="w-12 h-12 rounded-full bg-gray-900 text-white font-bold text-2xl flex items-center justify-center mx-auto mb-4">{item.step}</div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <section id="capacidades" className="py-20 bg-white border-t border-gray-200">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: '#5DE1E5' }}>Capacidades</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Todo el ciclo de preparacion en un solo lugar</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {capabilities.map((item) => (
              <div key={item.title} className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <section id="beneficios" className="py-16 border-t border-gray-200" style={{ backgroundColor: '#5DE1E5' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h3 className="text-center text-xl font-semibold text-gray-900 mb-10">Impacto inmediato en la operacion de datos</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            {stats.map((stat) => (
              <div key={stat.label}>
                <p className="text-5xl font-bold text-gray-900 mb-2">{stat.value}</p>
                <p className="text-gray-800 font-medium">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <section id="audiencias" className="py-20 bg-white border-t border-gray-200">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: '#5DE1E5' }}>Para quien es</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Equipos que necesitan datos limpios y listos</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {audiences.map((item) => (
              <div key={item.title} className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <button onClick={() => setShowContactModal(true)} className="text-gray-900 px-8 py-3 rounded-lg font-semibold hover:opacity-90 transition-all shadow-md" style={{ backgroundColor: '#5DE1E5' }}>Agendar Demo</button>
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
                <div key={faq.q} className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
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
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">Listo para ordenar tus datos?</h2>
            <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">Agenda una demo y descubre como preparar informacion confiable sin friccion operativa.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button onClick={() => setShowContactModal(true)} className="text-white px-8 py-4 rounded-lg font-semibold hover:opacity-90 transition-all shadow-lg text-lg" style={{ backgroundColor: '#5DE1E5' }}>Agendar Demo</button>
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
    </div>
  );
}
