'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import NoticeModal from '@/components/ui/NoticeModal';

// Componente ImageWithSkeleton
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
  const hasLoadedRef = useRef(false); // Ref para rastrear si la imagen ya se cargó exitosamente

  useEffect(() => {
    // Si showWhenVisible es false, no cargar hasta que sea true
    if (showWhenVisible === false) {
      return;
    }
    
    // Si la imagen ya se cargó exitosamente antes, no resetear el estado
    if (hasLoadedRef.current) {
      setImageLoaded(true);
      setShowSkeleton(false);
      return;
    }
    
    // Solo resetear estados si la imagen aún no se ha cargado
    if (!hasLoadedRef.current) {
      setImageLoaded(false);
      setShowSkeleton(true);
    }
    
    // Precargar imagen
    const img = new Image();
    img.src = src;
    img.onload = () => {
      hasLoadedRef.current = true; // Marcar que la imagen ya se cargó
      setImageLoaded(true);
      setShowSkeleton(false);
      if (onLoad) onLoad();
    };
    img.onerror = () => {
      // Si hay error al cargar, ocultar skeleton de todas formas
      setImageLoaded(true);
      setShowSkeleton(false);
    };
  }, [src, onLoad, showWhenVisible]);

  const handleImageLoad = () => {
    hasLoadedRef.current = true; // Marcar que la imagen ya se cargó
    setShowSkeleton(false);
    setImageLoaded(true);
  };

  // Determinar si la imagen debe mostrarse (cargada y visible si showWhenVisible es true)
  // Si showWhenVisible es false, aún mostramos la imagen pero respetamos el estilo inline para la animación
  const shouldShowImage = imageLoaded && !showSkeleton;
  
  // Mostrar spinner si no está visible o si aún está cargando
  const shouldShowSpinner = showWhenVisible === false || showSkeleton;
  
  // Determinar si debe aplicar animación: solo cuando está lista para animar Y la imagen está cargada
  const shouldAnimate = animateWhenReady && shouldShowImage;

  // Separar clases de posicionamiento del contenedor de las de la imagen
  const containerClasses = className.includes('absolute') || className.includes('fixed') || className.includes('relative') 
    ? className 
    : `relative ${className}`;
  
  // Extraer solo las clases que no son de posicionamiento para la imagen
  // NO filtrar 'slide-up' - dejarlo pasar para que funcione la animación
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
  
  // Usar directamente las clases de imagen sin modificar slide-up
  const finalImageClasses = imageClasses.trim();

  // Estilo para la imagen: solo aplicar el style pasado como prop
  // La opacidad y visibilidad se controlan desde el componente padre
  const imageStyle: React.CSSProperties = {
    ...style,
  };

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
          style={imageStyle}
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

// Componente VideoWithSkeleton
function VideoWithSkeleton({ 
  src, 
  className = '', 
  style = {},
  autoPlay = false,
  loop = false,
  muted = false,
  playsInline = false
}: { 
  src: string; 
  className?: string; 
  style?: React.CSSProperties;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  playsInline?: boolean;
}) {
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [showSpinner, setShowSpinner] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.load();
    }
  }, []);

  const handleVideoLoadedData = () => {
    setVideoLoaded(true);
    // Desvanecer spinner y mostrar video con fade in slide up
    setTimeout(() => {
      setShowSpinner(false);
    }, 300);
  };

  return (
    <div className={`relative ${className}`} style={style}>
      {showSpinner && (
        <div 
          className="absolute inset-0 flex items-center justify-center z-10 transition-opacity duration-500"
          style={{ opacity: showSpinner ? 1 : 0, backgroundColor: 'white' }}
        >
          <div 
            className="inline-block animate-spin rounded-full"
            style={{ 
              width: '48px',
              height: '48px',
              border: '4px solid rgba(93, 225, 229, 0.2)',
              borderTopColor: '#5DE1E5',
              borderRightColor: '#5DE1E5'
            }}
          ></div>
        </div>
      )}
      <video
        ref={videoRef}
        src={src}
        className={`${className} ${videoLoaded && !showSpinner ? 'opacity-100' : 'opacity-0'}`}
        style={{
          ...style,
          transition: videoLoaded && !showSpinner ? 'opacity 0.5s ease-out, transform 0.5s ease-out' : 'none',
          transform: videoLoaded && !showSpinner ? 'translateY(0)' : 'translateY(20px)'
        }}
        autoPlay={autoPlay}
        loop={loop}
        muted={muted}
        playsInline={playsInline}
        onLoadedData={handleVideoLoadedData}
        preload="auto"
      />
    </div>
  );
}

// Componente SectionCTA
function SectionCTA({ onClick, text = 'Contáctanos' }: { onClick: () => void; text?: string }) {
  return (
    <div className="flex justify-center mt-8 mb-4">
      <button
        onClick={onClick}
        className="text-gray-900 px-8 py-3 rounded-lg font-semibold hover:opacity-90 transition-all shadow-md font-raleway"
        style={{ backgroundColor: '#5DE1E5' }}
      >
        {text}
      </button>
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
  const [activeTab, setActiveTab] = useState<'select' | 'configure' | 'describe'>('select');
  const [agentsVisible, setAgentsVisible] = useState(false);
  const [agentsAnimationReady, setAgentsAnimationReady] = useState(false);
  const [worker1Visible, setWorker1Visible] = useState(false);
  const [worker2Visible, setWorker2Visible] = useState(false);
  const [worker3Visible, setWorker3Visible] = useState(false);
  const [iconVisible, setIconVisible] = useState(false);
  const [agentsIconVisible, setAgentsIconVisible] = useState(false);
  const [ctaIconVisible, setCtaIconVisible] = useState(false);
  const [footerWorkerVisible, setFooterWorkerVisible] = useState(false);
  const [activationSectionVisible, setActivationSectionVisible] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    phone: '',
    message: ''
  });
  const [contactLoading, setContactLoading] = useState(false);
  const [contactError, setContactError] = useState('');
  const [alertModal, setAlertModal] = useState<{ isOpen: boolean; title?: string; message: string; type?: 'success' | 'error' | 'info' | 'warning' }>({
    isOpen: false,
    message: '',
    type: 'info',
  });

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

  // Auto-focus en el primer campo cuando se abre el modal de contacto
  useEffect(() => {
    if (showContactModal) {
      setTimeout(() => {
        const nameInput = document.getElementById('contact-name') as HTMLInputElement;
        if (nameInput) {
          nameInput.focus();
        }
      }, 100);
    }
  }, [showContactModal]);

  // Intersection Observer para activar animación cuando se hace scroll a la sección de agentes
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setAgentsVisible(true);
            // Esperar un momento antes de activar la animación
            setTimeout(() => {
              setAgentsAnimationReady(true);
            }, 300);
          } else {
            // Resetear ambos flags cuando sale del viewport para permitir animación repetible
            setAgentsVisible(false);
            setAgentsAnimationReady(false);
          }
        });
      },
      { threshold: 0, rootMargin: '200px 0px 200px 0px' }
    );

    const agentsSection = document.getElementById('agents-section');
    if (agentsSection) {
      observer.observe(agentsSection);
    }

    return () => {
      if (agentsSection) {
        observer.unobserve(agentsSection);
      }
    };
  }, []);

  // Intersection Observer para Worker 1 - basado en título "Asistente de WhatsApp 24/7"
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setWorker1Visible(true);
          } else {
            setWorker1Visible(false);
          }
        });
      },
      { threshold: 0, rootMargin: '0px' }
    );

    const worker1Title = document.getElementById('worker1-title');
    if (worker1Title) {
      observer.observe(worker1Title);
    }

    return () => {
      if (worker1Title) {
        observer.unobserve(worker1Title);
      }
    };
  }, []);

  // Intersection Observer para Worker 2 - basado en título "Sistema de Automatización Integral"
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setWorker2Visible(true);
          } else {
            setWorker2Visible(false);
          }
        });
      },
      { threshold: 0, rootMargin: '0px' }
    );

    const worker2Title = document.getElementById('worker2-title');
    if (worker2Title) {
      observer.observe(worker2Title);
    }

    return () => {
      if (worker2Title) {
        observer.unobserve(worker2Title);
      }
    };
  }, []);

  // Intersection Observer para Worker 3 - basado en título "Analizador de Datos y Generador de Informes"
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setWorker3Visible(true);
          } else {
            setWorker3Visible(false);
          }
        });
      },
      { threshold: 0, rootMargin: '0px' }
    );

    const worker3Title = document.getElementById('worker3-title');
    if (worker3Title) {
      observer.observe(worker3Title);
    }

    return () => {
      if (worker3Title) {
        observer.unobserve(worker3Title);
      }
    };
  }, []);

  // Intersection Observer para la sección de activación - activa tabs y worker2
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActivationSectionVisible(true);
            setIconVisible(true);
          } else {
            setActivationSectionVisible(false);
            setIconVisible(false);
          }
        });
      },
      { threshold: 0, rootMargin: '200px 0px 0px 0px' }
    );

    const activationSection = document.getElementById('activation');
    if (activationSection) {
      observer.observe(activationSection);
    }

    return () => {
      if (activationSection) {
        observer.unobserve(activationSection);
      }
    };
  }, []);

  // Intersection Observer para el icono redondo - se activa desde la sección
  useEffect(() => {
    // Ya se maneja desde activationSectionVisible, este observer es redundante pero se mantiene por si acaso
    if (activationSectionVisible) {
      setIconVisible(true);
    }
  }, [activationSectionVisible]);

  // Intersection Observer para el icono de la sección de agentes - permanece visible una vez mostrado
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setAgentsIconVisible(true);
          }
          // No ocultar cuando sale del viewport, solo mostrar cuando entra
        });
      },
      { threshold: 0, rootMargin: '100px 0px 0px 0px' }
    );

    const agentsIconElement = document.getElementById('agents-icon');
    if (agentsIconElement) {
      observer.observe(agentsIconElement);
    }

    return () => {
      if (agentsIconElement) {
        observer.unobserve(agentsIconElement);
      }
    };
  }, []);

  // Intersection Observer para el icono de la sección CTA
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setCtaIconVisible(true);
          } else {
            setCtaIconVisible(false);
          }
        });
      },
      { threshold: 0, rootMargin: '100px 0px 0px 0px' }
    );

    const ctaIconElement = document.getElementById('cta-icon');
    if (ctaIconElement) {
      observer.observe(ctaIconElement);
    }

    return () => {
      if (ctaIconElement) {
        observer.unobserve(ctaIconElement);
      }
    };
  }, []);

  // Intersection Observer para el worker del footer - resetea cuando sale del viewport
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setFooterWorkerVisible(true);
          } else {
            // Resetear cuando sale del viewport para que vuelva a animar
            setFooterWorkerVisible(false);
          }
        });
      },
      { threshold: 0, rootMargin: '100px 0px 0px 0px' }
    );

    const footerWorkerElement = document.getElementById('footer-worker');
    if (footerWorkerElement) {
      observer.observe(footerWorkerElement);
    }

    return () => {
      if (footerWorkerElement) {
        observer.unobserve(footerWorkerElement);
      }
    };
  }, []);

  // Controlar visibilidad del botón volver arriba
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowBackToTop(true);
      } else {
        setShowBackToTop(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

  // Validación del formulario de contacto
  const validateContactForm = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!contactForm.name.trim()) {
      setContactError('El nombre es requerido');
      return false;
    }
    if (!contactForm.email.trim() || !emailRegex.test(contactForm.email)) {
      setContactError('Ingresa un email válido');
      return false;
    }
    if (!contactForm.phone.trim()) {
      setContactError('El teléfono es requerido');
      return false;
    }
    if (!contactForm.message.trim()) {
      setContactError('El mensaje es requerido');
      return false;
    }
    return true;
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactError('');
    
    if (!validateContactForm()) {
      return;
    }

    setContactLoading(true);

    try {
      // Capturar datos del navegador
      const browserData = {
        browser: navigator.userAgent.includes('Chrome') ? 'Chrome' : 
                 navigator.userAgent.includes('Firefox') ? 'Firefox' : 
                 navigator.userAgent.includes('Safari') ? 'Safari' : 
                 navigator.userAgent.includes('Edge') ? 'Edge' : 'Otro',
        os: navigator.platform,
        screen: `${window.screen.width}x${window.screen.height}`,
        language: navigator.language,
        country: 'Desconocido' // Se detectará en el servidor por IP
      };

      const requestBody = {
        ...contactForm,
        honeypot: (e.target as any).honeypot?.value || '',
        browserData,
      };

      console.log('[CONTACT FORM] Enviando datos:', {
        name: requestBody.name,
        email: requestBody.email,
        phone: requestBody.phone,
        messageLength: requestBody.message?.length,
        honeypot: requestBody.honeypot,
        browserData: requestBody.browserData
      });

      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('[CONTACT FORM] Response status:', response.status);
      console.log('[CONTACT FORM] Response ok:', response.ok);

      const data = await response.json();
      console.log('[CONTACT FORM] Response data:', data);

      if (!response.ok || !data.ok) {
        console.error('[CONTACT FORM] Error en respuesta:', data.error);
        setContactError(data.error || 'Error al enviar el mensaje. Por favor intenta nuevamente.');
        setContactLoading(false);
        return;
      }

      // Éxito
      console.log('[CONTACT FORM] Mensaje enviado exitosamente');
      setShowContactModal(false);
      setContactForm({ name: '', email: '', phone: '', message: '' });
      setContactLoading(false);
      setAlertModal({
        isOpen: true,
        title: 'Mensaje enviado',
        message: '¡Gracias por contactarnos! Te responderemos pronto.',
        type: 'success',
      });
    } catch (error) {
      console.error('[CONTACT FORM] Error al enviar formulario:', error);
      console.error('[CONTACT FORM] Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      setContactError('Error al enviar el mensaje. Por favor intenta nuevamente.');
      setContactLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <ImageWithSkeleton
                src="/public-img/logo-dworkers.png"
                alt="DWORKERS Zero Azul"
                className="h-6 w-auto"
              />
            </div>
            <nav className="hidden md:flex space-x-8 items-center">
              <a href="#activation" className="text-gray-600 hover:text-gray-900 transition-colors font-raleway">Proceso</a>
              <a href="#agents-section" className="text-gray-600 hover:text-gray-900 transition-colors font-raleway">Agentes</a>
              <a href="#faq" className="text-gray-600 hover:text-gray-900 transition-colors font-raleway">FAQ</a>
              <a href="#cta" className="text-gray-600 hover:text-gray-900 transition-colors font-raleway">Contacto</a>
              <button
                onClick={() => setShowContactModal(true)}
                className="text-gray-900 px-6 py-2 rounded-lg font-semibold hover:opacity-90 transition-all shadow-md font-raleway"
                style={{ backgroundColor: '#5DE1E5' }}
              >
                Demo
              </button>
              <button
                onClick={() => setShowLoginModal(true)}
                className="text-white px-6 py-2 rounded-lg font-semibold hover:opacity-90 transition-all shadow-md font-raleway"
                style={{ backgroundColor: '#000000' }}
              >
                Login
              </button>
            </nav>
            <button
              onClick={() => setShowContactModal(true)}
              className="md:hidden text-gray-900 px-4 py-2 rounded-lg font-semibold hover:opacity-90 transition-all shadow-md mr-2"
              style={{ backgroundColor: '#5DE1E5' }}
            >
              Demo
            </button>
            <button
              onClick={() => setShowLoginModal(true)}
              className="md:hidden text-white px-4 py-2 rounded-lg font-semibold hover:opacity-90 transition-all"
              style={{ backgroundColor: '#000000' }}
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
              <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 leading-tight" data-animate="animate-fade-in-up">
                Agencia de <span className="underline decoration-4" style={{ textDecorationColor: '#5DE1E5' }}>inteligencia artificial especialista en agentes IA</span>
              </h1>
              <p className="text-base sm:text-lg text-gray-600 leading-relaxed font-raleway" data-animate="animate-fade-in" style={{ animationDelay: '0.1s' }}>
                Con el poder de la <strong>Inteligencia artificial</strong> y <strong>RPA</strong> ofrecemos un equipo de trabajo infinito, eficiente y efectivo para tareas en tu empresa.
              </p>
              <p className="text-base sm:text-lg text-gray-700 leading-relaxed font-raleway font-medium" data-animate="animate-fade-in" style={{ animationDelay: '0.15s' }}>
                Contrata un asistente o un equipo entero de <strong>multiagentes</strong>, asígnales tareas repetitivas, atiende tus clientes en horarios no laborales, recibe informes de gestión mientras tu equipo humano descansa o realiza tareas que generen valor.
              </p>
            </div>


            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4" data-animate="animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <button 
                onClick={() => setShowContactModal(true)}
                className="text-gray-900 px-6 sm:px-8 py-3 rounded-lg font-semibold hover:opacity-90 transition-all text-center shadow-md font-raleway"
                style={{ backgroundColor: '#5DE1E5' }}
              >
                Agenda una DEMO
              </button>
              <button 
                onClick={() => {
                  const activationSection = document.getElementById('activation');
                  activationSection?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="bg-gray-200 text-gray-900 px-6 sm:px-8 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors text-center font-raleway"
              >
                Ver Proceso
              </button>
            </div>
          </div>

          {/* Right Side - Video */}
          <div className="hidden lg:block relative">
            <div className="relative bg-white rounded-3xl overflow-hidden h-full min-h-[500px] flex items-center justify-center">
              <VideoWithSkeleton
                src="/public-img/worker1.mp4"
                className="w-full h-full object-cover"
                autoPlay
                loop
                muted
                playsInline
              />
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
              <div id="activation-icon" className="flex justify-center relative z-20" style={{ marginTop: '-105px', paddingBottom: '60px' }}>
                <div 
                  className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all duration-1000 ease-out ${iconVisible ? 'icon-roll-in' : ''}`}
                  style={{ backgroundColor: '#5DE1E5', opacity: iconVisible ? 1 : 0 }}
                >
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
              </div>
              
              {/* Título */}
              <div className="text-center mb-8">
                <h2 className="font-raleway text-4xl font-bold text-gray-900 mb-6" data-animate="animate-fade-in-up">
                  Nuestros empleados digitales se encargan de todo
                </h2>
                <p className="font-raleway text-lg text-gray-600 leading-relaxed max-w-3xl mx-auto mb-8" data-animate="animate-fade-in" style={{ animationDelay: '0.1s' }}>
                  Automatizamos tareas repetitivas y manuales, liberando a tu equipo humano para proyectos más estratégicos y creativos.
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
                  <span className={`font-raleway font-semibold ${activeTab === 'select' ? 'text-gray-900' : 'text-gray-900'}`}>Análisis de necesidades</span>
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
                  <span className={`font-raleway font-semibold ${activeTab === 'configure' ? 'text-gray-900' : 'text-gray-900'}`}>Construcción a la medida</span>
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
                  <span className={`font-raleway font-semibold ${activeTab === 'describe' ? 'text-gray-900' : 'text-gray-900'}`}>Implementación y optimización</span>
                </button>
              </div>

              {/* Bloque de texto complementario - Moderno y llamativo - Solo mitad derecha */}
              <div className="bg-white rounded-2xl p-8 lg:p-12 lg:m-16 border border-gray-200 shadow-xl relative overflow-visible">
                {/* Imagen worker2.png dentro del div (off canvas, mitad dentro mitad fuera) */}
                <div 
                  className={`absolute left-0 top-1/2 hidden lg:block ${activationSectionVisible ? 'float-slow' : ''}`} 
                  style={{ 
                    zIndex: 20, 
                    left: '-55px', 
                    top: '50%', 
                    opacity: activationSectionVisible ? 1 : 0, 
                    transition: 'opacity 0.8s ease-in'
                  }}
                >
                  <ImageWithSkeleton
                    src="/public-img/worker2.png"
                    alt="Worker"
                    className="h-[460px] w-auto object-contain"
                    showWhenVisible={true}
                    style={{ 
                      opacity: 1
                    }}
                  />
                </div>
                
                {/* Contenedor que ocupa solo desde el centro hacia la derecha (65%) - con max-width para limitar ancho total */}
                <div className="w-full lg:max-w-[65%] lg:ml-auto relative z-10">
                  {activeTab === 'select' && (
                    <div className="animate-fade-in">
                      <div className="px-4 lg:px-8">
                        <h3 className="font-raleway text-3xl lg:text-4xl font-bold text-gray-900 mb-6">
                          Analizamos tu negocio para diseñar <span className="font-bold italic underline" style={{ textDecorationColor: '#5DE1E5' }}>agentes IA</span> personalizados
                        </h3>
                        <p className="font-raleway text-xl text-gray-700 leading-relaxed mb-8">
                          Realizamos un <strong>análisis profundo</strong> de tus procesos, necesidades y objetivos. Identificamos áreas de automatización y diseñamos <strong>asistentes digitales</strong> que se integran perfectamente con tu operación.
                        </p>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-start gap-3 group">
                          <div className="mt-2 flex-shrink-0 w-2 h-2 rounded-full bg-[#5DE1E5]"></div>
                          <p className="font-raleway text-lg text-gray-700 font-medium group-hover:text-[#5DE1E5] transition-colors">
                            Evaluación de procesos y flujos de trabajo actuales
                          </p>
                        </div>
                        <div className="flex items-start gap-3 group">
                          <div className="mt-2 flex-shrink-0 w-2 h-2 rounded-full bg-[#5DE1E5]"></div>
                          <p className="font-raleway text-lg text-gray-700 font-medium group-hover:text-[#5DE1E5] transition-colors">
                            Identificación de tareas repetitivas y oportunidades de automatización
                          </p>
                        </div>
                        <div className="flex items-start gap-3 group">
                          <div className="mt-2 flex-shrink-0 w-2 h-2 rounded-full bg-[#5DE1E5]"></div>
                          <p className="font-raleway text-lg text-gray-700 font-medium group-hover:text-[#5DE1E5] transition-colors">
                            Definición de objetivos estratégicos y métricas de éxito
                          </p>
                        </div>
                      </div>
                      <SectionCTA onClick={() => setShowContactModal(true)} text="Agendemos una asesoría" />
                    </div>
                  )}
                  
                  {activeTab === 'configure' && (
                    <div className="animate-fade-in">
                      <div className="px-4 lg:px-8">
                        <h3 className="font-raleway text-3xl lg:text-4xl font-bold text-gray-900 mb-6">
                          Construimos <span className="font-bold italic underline" style={{ textDecorationColor: '#5DE1E5' }}>agentes IA</span> a la medida de tu empresa
                        </h3>
                        <p className="font-raleway text-xl text-gray-700 leading-relaxed mb-8">
                          Desarrollamos <strong>multiagentes</strong> personalizados que se adaptan a tu operación. Cada <strong>asistente digital</strong> es diseñado específicamente para tus procesos, integrando <strong>inteligencia artificial</strong> y <strong>RPA</strong> de forma inteligente.
                        </p>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-start gap-3 group">
                          <div className="mt-2 flex-shrink-0 w-2 h-2 rounded-full bg-[#5DE1E5]"></div>
                          <p className="font-raleway text-lg text-gray-700 font-medium group-hover:text-[#5DE1E5] transition-colors">
                            Desarrollo de arquitectura de agentes multiagente específica
                          </p>
                        </div>
                        <div className="flex items-start gap-3 group">
                          <div className="mt-2 flex-shrink-0 w-2 h-2 rounded-full bg-[#5DE1E5]"></div>
                          <p className="font-raleway text-lg text-gray-700 font-medium group-hover:text-[#5DE1E5] transition-colors">
                            Integración con tus sistemas existentes y APIs
                          </p>
                        </div>
                        <div className="flex items-start gap-3 group">
                          <div className="mt-2 flex-shrink-0 w-2 h-2 rounded-full bg-[#5DE1E5]"></div>
                          <p className="font-raleway text-lg text-gray-700 font-medium group-hover:text-[#5DE1E5] transition-colors">
                            Configuración de personalidad, tono y reglas de negocio
                          </p>
                        </div>
                      </div>
                      <SectionCTA onClick={() => setShowContactModal(true)} text="Escríbenos" />
                    </div>
                  )}
                  
                  {activeTab === 'describe' && (
                    <div className="animate-fade-in">
                      <div className="px-4 lg:px-8">
                        <h3 className="font-raleway text-3xl lg:text-4xl font-bold text-gray-900 mb-6">
                          Implementamos y optimizamos tus <span className="font-bold italic underline" style={{ textDecorationColor: '#5DE1E5' }}>agentes digitales</span>
                        </h3>
                        <p className="font-raleway text-xl text-gray-700 leading-relaxed mb-8">
                          Desplegamos tus <strong>agentes IA</strong> en producción con acompañamiento continuo. Monitoreamos su rendimiento, ajustamos parámetros y optimizamos para garantizar máximo impacto en tu operación.
                        </p>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-start gap-3 group">
                          <div className="mt-2 flex-shrink-0 w-2 h-2 rounded-full bg-[#5DE1E5]"></div>
                          <p className="font-raleway text-lg text-gray-700 font-medium group-hover:text-[#5DE1E5] transition-colors">
                            Despliegue seguro en tu infraestructura o cloud
                          </p>
                        </div>
                        <div className="flex items-start gap-3 group">
                          <div className="mt-2 flex-shrink-0 w-2 h-2 rounded-full bg-[#5DE1E5]"></div>
                          <p className="font-raleway text-lg text-gray-700 font-medium group-hover:text-[#5DE1E5] transition-colors">
                            Monitoreo continuo y ajustes de rendimiento
                          </p>
                        </div>
                        <div className="flex items-start gap-3 group">
                          <div className="mt-2 flex-shrink-0 w-2 h-2 rounded-full bg-[#5DE1E5]"></div>
                          <p className="font-raleway text-lg text-gray-700 font-medium group-hover:text-[#5DE1E5] transition-colors">
                            Capacitación de tu equipo y documentación completa
                          </p>
                        </div>
                      </div>
                      <SectionCTA onClick={() => setShowContactModal(true)} text="Comunícate con nosotros" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

        {/* Sección 4: Tipos de Agentes Digitales */}
        <section id="agents-section" className="py-20 bg-white border-t border-gray-200">
          <div className="max-w-6xl mx-auto">
            {/* Icono redondo encima del título */}
            <div id="agents-icon" className="flex justify-center relative z-20 mb-4" style={{ marginTop: '-105px', paddingBottom: '20px' }}>
              <div 
                className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all duration-1000 ease-out ${agentsIconVisible ? 'icon-roll-in' : ''}`}
                style={{ 
                  backgroundColor: '#5DE1E5', 
                  opacity: agentsIconVisible ? 1 : 0,
                  visibility: agentsIconVisible ? 'visible' : 'hidden'
                }}
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
            <div className="text-center mb-12">
              <h2 className="font-raleway text-4xl font-bold text-gray-900 mb-4" data-animate="animate-fade-in-up">
                Tipos de <span className="font-bold italic underline" style={{ textDecorationColor: '#5DE1E5' }}>agentes digitales</span> disponibles
              </h2>
              <p className="font-raleway text-lg text-gray-600 leading-relaxed max-w-3xl mx-auto pb-16" data-animate="animate-fade-in" style={{ animationDelay: '0.1s' }}>
                Ofrecemos tres tipos principales de <strong>agentes IA</strong>: un asistente de WhatsApp 24/7 con lenguaje natural, un sistema que automatiza todo en tu negocio incluyendo marketing, y un analizador de datos que genera tableros e informes. Todos trabajan como <strong>multiagentes</strong> coordinados.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Agente 1 - worker3 */}
              <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm hover:shadow-lg transition-shadow overflow-visible relative" data-animate="animate-fade-in-up">
                {/* Contenedor de imagen - solo mitad superior visible */}
                <div className="h-48 overflow-hidden mb-6 relative" style={{ marginTop: '-80px' }}>
                  <ImageWithSkeleton
                    key={`worker1-${worker1Visible}`}
                    src="/public-img/worker3.png"
                    alt="Worker 3"
                    className={`w-full h-full object-cover object-top ${worker1Visible ? 'slide-up' : ''}`}
                    showWhenVisible={true}
                    animateWhenReady={false}
                    style={{ 
                      objectPosition: 'center top'
                    }}
                  />
                </div>
                {/* Icono WhatsApp flotante - esquina superior derecha de la card */}
                <div className="absolute top-2 right-2 w-12 h-12 rounded-full flex items-center justify-center float-slow" style={{ backgroundColor: '#5DE1E5', zIndex: 50 }}>
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                  </svg>
                </div>
                <h3 id="worker1-title" className="font-raleway text-2xl font-bold text-gray-900 mb-3">
                  Asistente de WhatsApp 24/7
                </h3>
                <p className="font-raleway text-gray-600 leading-relaxed">
                  Atiende a tus clientes con <strong>lenguaje natural</strong> las 24 horas del día. Responde consultas, procesa pedidos y mantiene conversaciones fluidas en WhatsApp, usando <strong>inteligencia artificial</strong> para entender contexto y emociones.
                </p>
              </div>

              {/* Agente 2 - worker5 */}
              <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm hover:shadow-lg transition-shadow overflow-visible relative" data-animate="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                {/* Contenedor de imagen - solo mitad superior visible */}
                <div className="h-48 overflow-hidden mb-6 relative" style={{ marginTop: '-80px' }}>
                  <ImageWithSkeleton
                    key={`worker2-${worker2Visible}`}
                    src="/public-img/worker5.png"
                    alt="Worker 5"
                    className={`w-full h-full object-cover object-top ${worker2Visible ? 'slide-up' : ''}`}
                    showWhenVisible={true}
                    animateWhenReady={false}
                    style={{ 
                      objectPosition: 'center top'
                    }}
                  />
                </div>
                {/* Icono Automatización flotante - esquina superior derecha de la card */}
                <div className="absolute top-2 right-2 w-12 h-12 rounded-full flex items-center justify-center float-slow" style={{ backgroundColor: '#5DE1E5', zIndex: 50 }}>
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 id="worker2-title" className="font-raleway text-2xl font-bold text-gray-900 mb-3">
                  Sistema de Automatización Integral
                </h3>
                <p className="font-raleway text-gray-600 leading-relaxed">
                  Automatiza <strong>todo en tu negocio</strong> incluyendo marketing, ventas, operaciones y más. Este <strong>agente IA</strong> coordina múltiples procesos simultáneamente, gestiona campañas, procesa pedidos y optimiza flujos de trabajo de forma autónoma.
                </p>
              </div>

              {/* Agente 3 - worker4 */}
              <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm hover:shadow-lg transition-shadow overflow-visible relative" data-animate="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                {/* Contenedor de imagen - solo mitad superior visible */}
                <div className="h-48 overflow-hidden mb-6 relative" style={{ marginTop: '-80px' }}>
                  <ImageWithSkeleton
                    key={`worker3-${worker3Visible}`}
                    src="/public-img/worker4.png"
                    alt="Worker 4"
                    className={`w-full h-full object-cover object-top ${worker3Visible ? 'slide-up' : ''}`}
                    showWhenVisible={true}
                    animateWhenReady={false}
                    style={{ 
                      objectPosition: 'center top'
                    }}
                  />
                </div>
                {/* Icono Estadísticas flotante - esquina superior derecha de la card */}
                <div className="absolute top-2 right-2 w-12 h-12 rounded-full flex items-center justify-center float-slow" style={{ backgroundColor: '#5DE1E5', zIndex: 50 }}>
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 id="worker3-title" className="font-raleway text-2xl font-bold text-gray-900 mb-3">
                  Analizador de Datos y Generador de Informes
                </h3>
                <p className="font-raleway text-gray-600 leading-relaxed">
                  Analiza datos de múltiples fuentes y genera <strong>tableros e informes</strong> automáticos. Identifica tendencias, patrones y oportunidades, presentando insights accionables para la toma de decisiones estratégicas.
                </p>
              </div>
            </div>
            {/* CTA después de Agents-section */}
            <SectionCTA onClick={() => setShowContactModal(true)} text="Hablemos de tu proyecto" />
          </div>
        </section>

        {/* Sección 5: Preguntas Frecuentes (FAQ) */}
        <section id="faq" className="py-20 bg-white border-t border-gray-200">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="font-raleway text-4xl font-bold text-gray-900 mb-4" data-animate="animate-fade-in-up">
                Preguntas frecuentes sobre <span className="font-bold italic underline" style={{ textDecorationColor: '#5DE1E5' }}>agentes IA</span> y <span className="font-bold italic underline" style={{ textDecorationColor: '#5DE1E5' }}>asistentes digitales</span>
              </h2>
              <p className="font-raleway text-lg text-gray-600 leading-relaxed" data-animate="animate-fade-in" style={{ animationDelay: '0.1s' }}>
                Somos una <strong>agencia de inteligencia artificial</strong> especializada en <strong>multiagentes</strong> y <strong>automatización empresarial</strong>. Aquí respondemos las dudas más comunes sobre nuestros <strong>agentes digitales</strong>:
              </p>
            </div>

            <div className="space-y-4">
              {[
                {
                  q: '¿Qué son los agentes IA y cómo funcionan?',
                  a: 'Los agentes IA (agentes de inteligencia artificial) son sistemas autónomos que utilizan aprendizaje automático y procesamiento de lenguaje natural para realizar tareas específicas. Nuestros multiagentes trabajan coordinadamente, cada uno especializado en áreas como atención al cliente, automatización de procesos o análisis de datos, comunicándose entre sí para resolver tareas complejas.'
                },
                {
                  q: '¿Cuánto tiempo toma desarrollar un agente digital personalizado?',
                  a: 'El tiempo varía según la complejidad, pero generalmente el proceso completo (análisis, construcción e implementación) toma entre 4 a 8 semanas. Incluye análisis de necesidades, diseño de arquitectura multiagente, desarrollo del asistente digital, pruebas e implementación gradual.'
                },
                {
                  q: '¿Los agentes pueden integrarse con mis sistemas existentes?',
                  a: 'Sí, nuestros asistentes digitales se integran con APIs, bases de datos, CRMs, ERPs y prácticamente cualquier sistema mediante conectores estándar. La integración es parte del proceso de construcción a la medida.'
                },
                {
                  q: '¿Qué diferencia a DWORKERS de otras agencias de inteligencia artificial?',
                  a: 'Somos especialistas en arquitecturas multiagente, donde varios agentes IA trabajan coordinados. No solo automatizamos tareas individuales, sino que creamos ecosistemas de agentes digitales que se comunican entre sí para resolver procesos complejos. Además, ofrecemos análisis profundo y construcción completamente personalizada.'
                },
                {
                  q: '¿Los agentes aprenden y mejoran con el tiempo?',
                  a: 'Sí, todos nuestros agentes IA incluyen capacidades de aprendizaje continuo. A medida que procesan más datos e interacciones, mejoran su precisión, entendimiento contextual y capacidad de respuesta. Aplicamos técnicas de fine-tuning y actualizaciones periódicas del modelo.'
                },
                {
                  q: '¿Qué tipo de empresas pueden beneficiarse de agentes digitales?',
                  a: 'Cualquier empresa que tenga tareas repetitivas, alto volumen de interacciones con clientes, necesidad de análisis de datos o procesos que requieran automatización. Desde startups hasta grandes corporaciones, e-commerce, servicios financieros, salud, educación y más.'
                },
                {
                  q: '¿Cuál es el costo de implementar agentes IA en mi empresa?',
                  a: 'El costo varía según la complejidad, número de agentes y alcance del proyecto. Ofrecemos paquetes desde asistente básico hasta ecosistemas multiagente completos. Agenda una demo gratuita para recibir una cotización personalizada basada en tus necesidades específicas.'
                },
                {
                  q: '¿Qué seguridad y privacidad ofrecen los agentes digitales?',
                  a: 'Implementamos encriptación end-to-end, cumplimiento con normativas de protección de datos (GDPR, LFPDPPP), acceso controlado por roles, y auditorías de seguridad regulares. Los datos permanecen bajo tu control y pueden almacenarse en tu infraestructura si lo prefieres.'
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
            {/* CTA después de FAQ */}
            <SectionCTA onClick={() => setShowContactModal(true)} text="Tengo más preguntas" />
          </div>
        </section>

        {/* Sección 6: Llamado a la Acción (CTA) */}
        <section id="cta" className="py-20 border-t border-gray-200 w-full" style={{ backgroundColor: '#5DE1E5', width: '100vw', marginLeft: 'calc(50% - 50vw)' }}>
          <div className="max-w-4xl mx-auto text-center px-4">
            {/* Icono redondo encima del título */}
            <div id="cta-icon" className="flex justify-center relative z-20 mb-4" style={{ marginTop: '-105px', paddingBottom: '20px' }}>
              <div 
                className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all duration-1000 ease-out ${ctaIconVisible ? 'icon-roll-in' : ''}`}
                style={{ backgroundColor: '#5DE1E5', border: '5px solid white', opacity: ctaIconVisible ? 1 : 0 }}
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
            <h2 className="font-raleway text-4xl font-bold text-gray-900 mb-6" data-animate="animate-fade-in-up">
              ¿Listo para contratar tus primeros <span className="font-bold italic underline" style={{ textDecorationColor: 'rgba(0,0,0,0.3)' }}>empleados digitales</span>?
            </h2>
            <p className="font-raleway text-lg text-gray-800 mb-8 leading-relaxed" data-animate="animate-fade-in" style={{ animationDelay: '0.1s' }}>
              Agenda una <strong>demo gratuita</strong> y descubre cómo nuestros <strong>agentes IA</strong> pueden transformar tu operación. Contrata un asistente o un equipo entero de <strong>multiagentes</strong> diseñados específicamente para tu negocio.
            </p>
            <button
              onClick={() => setShowContactModal(true)}
              className="bg-gray-900 text-white px-8 py-4 rounded-lg font-raleway font-semibold text-lg hover:bg-gray-800 transition-colors shadow-lg"
            >
              Agenda una DEMO
            </button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 mt-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            {/* Logo y Descripción */}
            <div className="col-span-1 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <span className="font-raleway text-2xl font-bold">
                  DWORKERS
                </span>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#5DE1E5' }}></span>
              </div>
              <p className="font-raleway text-sm text-gray-400 leading-relaxed">
                <strong>Empleados digitales multiagente con inteligencia artificial</strong>. Automatizamos interacciones y optimizamos procesos empresariales. Maximiza beneficios con nuestra <strong>agencia de inteligencia artificial</strong> especializada en <strong>agentes IA</strong> y <strong>asistentes digitales</strong>.
              </p>
            </div>

            {/* Columna vacía 2 */}
            <div></div>

            {/* Worker2b.png - Tercera columna */}
            <div id="footer-worker" className="relative overflow-visible flex items-end">
              <div className="overflow-hidden relative w-full" style={{ marginTop: '-80px', marginBottom: '-30px', height: '15rem' }}>
                <ImageWithSkeleton
                  src="/public-img/worker2b.png"
                  alt="Worker 2b"
                  className={`w-full h-full object-cover object-top ${footerWorkerVisible ? 'slide-up' : ''}`}
                  style={{ 
                    objectPosition: 'center top', 
                    clipPath: footerWorkerVisible ? 'inset(0 0 0% 0)' : 'inset(0 0 100% 0)',
                    transition: footerWorkerVisible ? 'clip-path 1s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
                    opacity: footerWorkerVisible ? 1 : 0
                  }}
                />
              </div>
            </div>
          </div>

          {/* Redes sociales */}
          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="font-raleway text-sm text-gray-400 mb-4 md:mb-0">
              © 2025 DWRKRS <a href="https://zeroazul.com/" target="_blank" rel="noopener noreferrer" className="text-[#5DE1E5] hover:text-white transition-colors underline">Zero Azul</a>. Todos los derechos reservados.
            </p>
            <div className="flex gap-4">
              <a href="https://www.facebook.com/zeroazulagencia" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#5DE1E5] transition-colors" aria-label="Facebook">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>
              <a href="https://www.instagram.com/zeroazulagencia/" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#5DE1E5] transition-colors" aria-label="Instagram">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
              <a href="https://twitter.com/ZeroAzulAgencia" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#5DE1E5] transition-colors" aria-label="X (Twitter)">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
              <a href="https://www.linkedin.com/company/22294464" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#5DE1E5] transition-colors" aria-label="LinkedIn">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </a>
              <a href="https://www.behance.net/zeroazul_agencia" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#5DE1E5] transition-colors" aria-label="Behance">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M22 7h-7v-2h7v2zm1.726 10c-.442 1.297-2.029 3-5.101 3-3.074 0-5.564-1.729-5.564-5.675 0-3.91 2.325-5.92 5.466-5.92 3.082 0 4.637 1.711 5.052 3H19.678c-.219-1.028-1.26-1.754-2.651-1.754-2.293 0-3.789 1.478-3.789 4.135 0 2.63 1.396 4.084 3.617 4.084 1.416 0 2.36-.627 2.773-1.423h-1.769v-2.833h4.259zm-7.321-9.375c-1.198 0-2.063-.689-2.468-1.636h4.636c-.31-.947-1.177-1.636-2.168-1.636zM5.808 11.534C5.78 11.534 5.753 11.534 5.72 11.534H0v11.114h5.792c3.076 0 5.139-1.685 5.139-5.596 0-3.701-2.074-5.518-5.123-5.518zm.632 8.728H3.25v-6.414h2.382c1.673 0 2.623 1.015 2.623 3.22 0 2.133-.949 3.194-2.815 3.194zM24 11.534v11.114h-3.154v-11.114H24z"/>
                </svg>
              </a>
              <a href="https://www.tiktok.com/@zeroazul" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#5DE1E5] transition-colors" aria-label="TikTok">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                </svg>
              </a>
              <a href="https://www.youtube.com/@zeroazul" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#5DE1E5] transition-colors" aria-label="YouTube">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
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
            <div className="absolute w-48 h-48 float-slow" style={{ zIndex: 999, top: '30px', left: '-105px' }}>
              <ImageWithSkeleton
                src="/public-img/worker1b.png"
                alt="Worker"
                className="w-full h-full object-contain"
                showWhenVisible={true}
              />
            </div>
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

      {/* Modal de Contacto */}
      {showContactModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto" onClick={() => setShowContactModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full my-8 relative" onClick={(e) => e.stopPropagation()}>
            {/* Imagen worker1b.png flotante - 20% más grande */}
            <div className="absolute w-[260px] h-[260px] float-slow hidden lg:block" style={{ zIndex: 999, top: '65px', left: '-157px' }}>
              <ImageWithSkeleton
                src="/public-img/worker1b.png"
                alt="Worker"
                className="w-full h-full object-contain"
                showWhenVisible={true}
              />
            </div>
            <div className="p-6 lg:p-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 font-raleway">Contáctanos</h3>
                <button
                  onClick={() => {
                    setShowContactModal(false);
                    setContactError('');
                    setContactForm({ name: '', email: '', phone: '', message: '' });
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                  aria-label="Cerrar modal"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <form onSubmit={handleContactSubmit} className="space-y-4">
              {/* Campo honeypot (oculto para usuarios reales, visible para bots) */}
              <div style={{ position: 'absolute', left: '-9999px', opacity: 0, pointerEvents: 'none' }}>
                <label htmlFor="honeypot">No llenar este campo</label>
                <input
                  id="honeypot"
                  name="honeypot"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                />
              </div>
              
              <div>
                <label htmlFor="contact-name" className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre <span className="text-red-500">*</span>
                </label>
                <input
                  id="contact-name"
                  name="name"
                  type="text"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent focus:ring-[#5DE1E5]"
                  placeholder="Tu nombre completo"
                  value={contactForm.name}
                  onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor="contact-email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  id="contact-email"
                  name="email"
                  type="email"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent focus:ring-[#5DE1E5]"
                  placeholder="tu@email.com"
                  value={contactForm.email}
                  onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor="contact-phone" className="block text-sm font-medium text-gray-700 mb-2">
                  Teléfono <span className="text-red-500">*</span>
                </label>
                <input
                  id="contact-phone"
                  name="phone"
                  type="tel"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent focus:ring-[#5DE1E5]"
                  placeholder="+57 300 123 4567"
                  value={contactForm.phone}
                  onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor="contact-message" className="block text-sm font-medium text-gray-700 mb-2">
                  Mensaje <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="contact-message"
                  name="message"
                  required
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent focus:ring-[#5DE1E5] resize-none"
                  placeholder="Cuéntanos sobre tu proyecto..."
                  value={contactForm.message}
                  onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                />
              </div>

              {contactError && (
                <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                  {contactError}
                </div>
              )}

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowContactModal(false);
                      setContactError('');
                      setContactForm({ name: '', email: '', phone: '', message: '' });
                    }}
                    className="flex-1 bg-gray-200 text-gray-900 py-3 px-6 rounded-lg font-medium hover:bg-gray-300 transition-colors font-raleway"
                  >
                    Cerrar
                  </button>
                  <button
                    type="submit"
                    disabled={contactLoading}
                    className="flex-1 text-gray-900 py-3 px-6 rounded-lg font-medium hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[#5DE1E5] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-raleway"
                    style={{ backgroundColor: '#5DE1E5' }}
                  >
                    {contactLoading ? (
                      <span className="flex items-center justify-center">
                        <span className="inline-block animate-spin h-5 w-5 border-2 border-gray-900 border-t-transparent rounded-full mr-2"></span>
                        Enviando...
                      </span>
                    ) : (
                      'Enviar'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal de alertas */}
      <NoticeModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
      />

      {/* Botón flotante WhatsApp */}
      <a
        href="https://wa.me/573195947797"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 w-14 h-14 bg-green-500 rounded-full flex items-center justify-center shadow-lg hover:bg-green-600 transition-colors z-50"
        aria-label="Contactar por WhatsApp"
      >
        <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
        </svg>
      </a>

      {/* Botón volver arriba */}
      {showBackToTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 left-6 w-12 h-12 bg-gray-900 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-gray-800 transition-colors z-50"
          aria-label="Volver arriba"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        </button>
      )}
    </div>
  );
}
