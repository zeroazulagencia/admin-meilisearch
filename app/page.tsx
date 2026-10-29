'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import NoticeModal from '@/components/ui/NoticeModal';
import { findFirstAccessibleRoute } from '@/utils/permissions';
import LandingHeader from '@/components/landing/LandingHeader';
import LandingFooter from '@/components/landing/LandingFooter';
import HomeSections from '@/components/landing/HomeSections';
import { HOME_FAQS } from '@/components/landing/home-content';

export default function Home() {
  const { isAuthenticated, handleLogin } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
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

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'FAQPage', mainEntity: HOME_FAQS.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) },
    ],
  };

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <LandingHeader onContact={() => setShowContactModal(true)} onLogin={() => setShowLoginModal(true)} />
      <HomeSections onContact={() => setShowContactModal(true)} />
      <LandingFooter />

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