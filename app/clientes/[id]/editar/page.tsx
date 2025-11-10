'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import ProtectedLayout from '@/components/ProtectedLayout';
import NoticeModal from '@/components/ui/NoticeModal';
import { getPermissions } from '@/utils/permissions';

interface Client {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  nit?: string;
  clave?: string;
  permissions?: any;
}

export default function EditarCliente() {
  const router = useRouter();
  const params = useParams();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    nit: '',
    clave: ''
  });
  const [emailError, setEmailError] = useState('');
  const [currentClient, setCurrentClient] = useState<Client | null>(null);
  const [associatedAgents, setAssociatedAgents] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any>({});
  const [alertModal, setAlertModal] = useState<{ isOpen: boolean; title?: string; message: string; type?: 'success' | 'error' | 'info' | 'warning' }>({
    isOpen: false,
    message: '',
    type: 'info',
  });
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    // Verificar si el usuario es admin
    const permissions = getPermissions();
    if (permissions) {
      const userIsAdmin = permissions.type === 'admin';
      if (!userIsAdmin) {
        // No es admin, redirigir al dashboard
        router.push('/dashboard');
        return;
      }
    } else {
      // No hay permisos, redirigir al dashboard
      router.push('/dashboard');
      return;
    }

    if (!params?.id) return;
    
    const clientId = params.id as string;
    
    // Cargar cliente desde MySQL
    const loadClient = async () => {
      try {
        console.log('[EDITAR CLIENTE] Cargando cliente con ID:', clientId);
        const res = await fetch(`/api/clients/${clientId}`);
        const data = await res.json();
        console.log('[EDITAR CLIENTE] Respuesta del API:', data);
        
        if (data.ok && data.client) {
          const client = data.client;
          console.log('[EDITAR CLIENTE] Cliente cargado:', client);
          setCurrentClient(client);
          setFormData({
            name: client.name,
            email: client.email || '',
            phone: client.phone || '',
            company: client.company || '',
            nit: client.nit || '',
            clave: client.clave || ''
          });
          try {
            const perms = typeof client.permissions === 'string' ? JSON.parse(client.permissions) : (client.permissions || {});
            // Inicializar permisos con estructura completa
            const defaultPerms: any = {
              canLogin: perms.canLogin !== false,
            };
            MODULES.forEach(module => {
              defaultPerms[module.key] = {
                viewOwn: perms[module.key]?.viewOwn || perms[module.key]?.view || false,
                viewAll: perms[module.key]?.viewAll || false,
                editOwn: perms[module.key]?.editOwn || perms[module.key]?.edit || false,
                editAll: perms[module.key]?.editAll || false,
                createOwn: !module.onlyView ? (perms[module.key]?.createOwn || perms[module.key]?.create || false) : false,
                createAll: !module.onlyView ? (perms[module.key]?.createAll || false) : false,
                deleteOwn: !module.onlyView ? (perms[module.key]?.deleteOwn || false) : false
              };
            });
            setPermissions(defaultPerms);
          } catch {
            const defaultPerms: any = { canLogin: true };
            MODULES.forEach(module => {
              defaultPerms[module.key] = { 
                viewOwn: false, 
                viewAll: false,
                editOwn: false, 
                editAll: false,
                createOwn: !module.onlyView ? false : undefined,
                createAll: !module.onlyView ? false : undefined,
                deleteOwn: !module.onlyView ? false : undefined
              };
            });
            setPermissions(defaultPerms);
          }
          
          // Buscar agentes asociados desde MySQL
          try {
            const resAgents = await fetch('/api/agents');
            const dataAgents = await resAgents.json();
            if (dataAgents.ok && dataAgents.agents) {
              const agentsForClient = dataAgents.agents.filter((a: any) => a.client_id === parseInt(clientId));
              setAssociatedAgents(agentsForClient);
            }
          } catch (e) {
            console.error('Error cargando agentes del cliente:', e);
          }
        } else {
          console.error('[EDITAR CLIENTE] Cliente no encontrado o respuesta inválida:', data);
          // NO redirigir automáticamente, mostrar error
          setAlertModal({
            isOpen: true,
            title: 'Error',
            message: 'Cliente no encontrado: ' + (data.error || 'Desconocido'),
            type: 'error',
          });
        }
      } catch (err) {
        console.error('[EDITAR CLIENTE] Error cargando cliente:', err);
        // NO redirigir automáticamente, mostrar error
        setAlertModal({
          isOpen: true,
          title: 'Error',
          message: 'Error al cargar el cliente: ' + (err instanceof Error ? err.message : 'Desconocido'),
          type: 'error',
        });
      }
    };
    
    loadClient();
  }, [params?.id, router]);

  const validateEmail = (email: string): boolean => {
    if (!email) return true; // Email es opcional
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('[EDITAR CLIENTE] handleSubmit llamado');
    console.log('[EDITAR CLIENTE] currentClient:', currentClient);
    console.log('[EDITAR CLIENTE] formData:', formData);
    
    if (!currentClient) {
      console.error('[EDITAR CLIENTE] No hay currentClient');
      return;
    }

    // Validar email
    if (formData.email && !validateEmail(formData.email)) {
      console.log('[EDITAR CLIENTE] Email inválido:', formData.email);
      setEmailError('Por favor ingresa un email válido');
      setAlertModal({
        isOpen: true,
        title: 'Error de validación',
        message: 'Por favor ingresa un email válido',
        type: 'error',
      });
      return;
    }
    setEmailError('');
    
    console.log('[EDITAR CLIENTE] Validación pasada, procediendo a enviar');

    try {
      console.log('[EDITAR CLIENTE] Enviando datos:', {
        id: currentClient.id,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        company: formData.company,
        nit: formData.nit,
        permissions
      });
      
      const res = await fetch(`/api/clients/${currentClient.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          company: formData.company,
          nit: formData.nit,
          clave: formData.clave,
          permissions
        })
      });
      
      const data = await res.json();
      console.log('[EDITAR CLIENTE] Respuesta del servidor:', data);
      
      if (data.ok) {
        setAlertModal({
          isOpen: true,
          title: 'Éxito',
          message: 'Cliente actualizado correctamente',
          type: 'success',
        });
        setTimeout(() => {
          router.push('/clientes');
        }, 1000);
      } else {
        console.error('[EDITAR CLIENTE] Error en respuesta:', data.error);
        setAlertModal({
          isOpen: true,
          title: 'Error',
          message: 'Error al actualizar: ' + (data.error || 'Desconocido'),
          type: 'error',
        });
      }
    } catch (err: any) {
      console.error('[EDITAR CLIENTE] Error en catch:', err);
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: 'Error al actualizar cliente: ' + (err?.message || 'Error de red'),
        type: 'error',
      });
    }
  };

  const togglePermission = (module: string, action: 'viewOwn' | 'viewAll' | 'editOwn' | 'editAll' | 'createOwn' | 'createAll' | 'deleteOwn') => {
    setPermissions((prev: any) => ({
      ...prev,
      [module]: {
        ...prev[module],
        [action]: !prev[module]?.[action]
      }
    }));
  };

  // Módulos exclusivos de admin (no se muestran en el editor de permisos)
  const ADMIN_ONLY_MODULES = ['dbManager', 'roadmap', 'clientes', 'ejecuciones', 'whatsappManager', 'consumoAPI'];
  
  const MODULES = [
    { key: 'dashboard', label: 'Dashboard', onlyView: true },
    { key: 'clientes', label: 'Clientes', onlyView: true },
    { key: 'agentes', label: 'Agentes', onlyView: true },
    { key: 'ejecuciones', label: 'Ejecuciones', onlyView: true },
    { key: 'adminConocimiento', label: 'Admin Conocimiento', onlyView: false },
    { key: 'reportes', label: 'Reportes', onlyView: true },
    { key: 'conversaciones', label: 'Conversaciones', onlyView: true },
    { key: 'whatsappManager', label: 'WhatsApp Manager', onlyView: true },
    { key: 'facturacion', label: 'Facturación', onlyView: true },
    { key: 'consumoAPI', label: 'Consumo API', onlyView: true },
    { key: 'developers', label: 'Developers', onlyView: true }
  ].filter(module => !ADMIN_ONLY_MODULES.includes(module.key));

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({ ...formData, clave: password });
  };


  if (!currentClient) {
    return (
      <ProtectedLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin h-12 w-12 border-4 border-t-transparent rounded-full" style={{ borderColor: '#5DE1E5' }}></div>
        </div>

        {/* Modal de alertas */}
        <NoticeModal
          isOpen={alertModal.isOpen}
          onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
          title={alertModal.title}
          message={alertModal.message}
          type={alertModal.type}
        />
      </ProtectedLayout>
    );
  }

  return (
    <ProtectedLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Editar Cliente</h1>
        <p className="mt-2 text-gray-600">Actualiza la información del cliente</p>
      </div>

        <form 
          onSubmit={(e) => {
            console.log('[EDITAR CLIENTE] Form onSubmit llamado');
            handleSubmit(e);
          }} 
          className="space-y-6" 
          noValidate
        >
          {/* Información del Cliente */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Información General</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                  style={{ '--tw-ring-color': '#5DE1E5' } as React.CSSProperties & { '--tw-ring-color': string }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value });
                    if (e.target.value && !validateEmail(e.target.value)) {
                      setEmailError('Email inválido');
                    } else {
                      setEmailError('');
                    }
                  }}
                  onBlur={(e) => {
                    if (e.target.value && !validateEmail(e.target.value)) {
                      setEmailError('Email inválido');
                    } else {
                      setEmailError('');
                    }
                  }}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent ${
                    emailError ? 'border-red-300' : 'border-gray-300'
                  }`}
                  style={{ '--tw-ring-color': emailError ? '#ef4444' : '#5DE1E5' } as React.CSSProperties & { '--tw-ring-color': string }}
                />
                {emailError && (
                  <p className="mt-1 text-sm text-red-600">{emailError}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Teléfono
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                  style={{ '--tw-ring-color': '#5DE1E5' } as React.CSSProperties & { '--tw-ring-color': string }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Empresa
                </label>
                <input
                  type="text"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                  style={{ '--tw-ring-color': '#5DE1E5' } as React.CSSProperties & { '--tw-ring-color': string }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  NIT
                </label>
                <input
                  type="text"
                  value={formData.nit}
                  onChange={(e) => setFormData({ ...formData, nit: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                  style={{ '--tw-ring-color': '#5DE1E5' } as React.CSSProperties & { '--tw-ring-color': string }}
                  placeholder="123456789-0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contraseña
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.clave}
                      onChange={(e) => setFormData({ ...formData, clave: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                  style={{ '--tw-ring-color': '#5DE1E5' } as React.CSSProperties & { '--tw-ring-color': string }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2 text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={generatePassword}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                    title="Generar contraseña aleatoria"
                  >
                    🔑
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Permisos */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Permisos del Sistema</h2>
            <p className="text-sm text-gray-500 mb-4">Selecciona los permisos que tendrá este cliente</p>

            {/* Login Checkbox */}
            <div className="mb-6 p-4 rounded-lg border" style={{ backgroundColor: 'rgba(93, 225, 229, 0.1)', borderColor: '#5DE1E5' }}>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={permissions.canLogin !== false}
                  onChange={(e) => setPermissions((prev: any) => ({ ...prev, canLogin: e.target.checked }))}
                  className="w-5 h-5 rounded focus:ring-[#5DE1E5]"
                  style={{ color: '#5DE1E5' }}
                />
                <span className="ml-3 text-base font-medium text-gray-900">
                  Puede hacer login
                </span>
              </label>
            </div>

            {/* Module Permissions - Organizado por secciones en 2 columnas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {MODULES.map((module) => {
                // Si es solo VER, mostrar solo viewOwn
                if (module.onlyView) {
                  return (
                    <div key={module.key} className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                      <h3 className="font-semibold text-gray-900 mb-3 text-base">{module.label}</h3>
                      
                      {/* Ver - Solo Propios */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Ver</h4>
                        <label className="flex items-center cursor-pointer p-2 rounded hover:bg-white transition-colors">
                          <input
                            type="checkbox"
                            checked={permissions[module.key]?.viewOwn || false}
                            onChange={() => togglePermission(module.key, 'viewOwn')}
                            className="w-4 h-4 text-[#5DE1E5] rounded focus:ring-[#5DE1E5]"
                            style={{ color: '#5DE1E5' }}
                          />
                          <span className="ml-2 text-sm text-gray-700">Propios</span>
                        </label>
                      </div>
                    </div>
                  );
                }

                // Admin Conocimiento: mostrar viewOwn, editOwn, createOwn, deleteOwn
                return (
                  <div key={module.key} className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                    <h3 className="font-semibold text-gray-900 mb-3 text-base">{module.label}</h3>
                    
                    {/* Ver */}
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Ver</h4>
                      <label className="flex items-center cursor-pointer p-2 rounded hover:bg-white transition-colors">
                        <input
                          type="checkbox"
                          checked={permissions[module.key]?.viewOwn || false}
                          onChange={() => togglePermission(module.key, 'viewOwn')}
                          className="w-4 h-4 text-[#5DE1E5] rounded focus:ring-[#5DE1E5]"
                          style={{ color: '#5DE1E5' }}
                        />
                        <span className="ml-2 text-sm text-gray-700">Propios</span>
                      </label>
                    </div>

                    {/* Editar */}
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Editar</h4>
                      <label className="flex items-center cursor-pointer p-2 rounded hover:bg-white transition-colors">
                        <input
                          type="checkbox"
                          checked={permissions[module.key]?.editOwn || false}
                          onChange={() => togglePermission(module.key, 'editOwn')}
                          className="w-4 h-4 text-[#5DE1E5] rounded focus:ring-[#5DE1E5]"
                          style={{ color: '#5DE1E5' }}
                        />
                        <span className="ml-2 text-sm text-gray-700">Propios</span>
                      </label>
                    </div>

                    {/* Crear */}
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Crear</h4>
                      <label className="flex items-center cursor-pointer p-2 rounded hover:bg-white transition-colors">
                        <input
                          type="checkbox"
                          checked={permissions[module.key]?.createOwn || false}
                          onChange={() => togglePermission(module.key, 'createOwn')}
                          className="w-4 h-4 text-[#5DE1E5] rounded focus:ring-[#5DE1E5]"
                          style={{ color: '#5DE1E5' }}
                        />
                        <span className="ml-2 text-sm text-gray-700">Propios</span>
                      </label>
                    </div>

                    {/* Eliminar */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Eliminar</h4>
                      <label className="flex items-center cursor-pointer p-2 rounded hover:bg-white transition-colors">
                        <input
                          type="checkbox"
                          checked={permissions[module.key]?.deleteOwn || false}
                          onChange={() => togglePermission(module.key, 'deleteOwn')}
                          className="w-4 h-4 text-[#5DE1E5] rounded focus:ring-[#5DE1E5]"
                          style={{ color: '#5DE1E5' }}
                        />
                        <span className="ml-2 text-sm text-gray-700">Propios</span>
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Agentes Asociados */}
          {associatedAgents.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Agentes Asociados ({associatedAgents.length})
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {associatedAgents.map((agent) => (
                  <div 
                    key={agent.id} 
                    className="border-2 border-gray-200 rounded-lg p-4 transition-colors cursor-pointer"
                    style={{ '--hover-border': '#5DE1E5' } as React.CSSProperties}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = '#5DE1E5'}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
                    onClick={() => router.push(`/agentes/${agent.id}/editar`)}
                  >
                    <div className="flex items-center gap-3">
                      {agent.photo && (
                        <div className="flex-shrink-0">
                          <img
                            src={agent.photo}
                            alt={agent.name}
                            className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">{agent.name}</h3>
                        {agent.description && (
                          <p className="text-sm text-gray-500 line-clamp-2">{agent.description}</p>
                        )}
                        {agent.conversation_agent_name && (
                          <p className="text-xs text-gray-400 mt-1">ID: {agent.conversation_agent_name}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {associatedAgents.length === 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
              <p className="text-gray-500">
                Este cliente no tiene agentes asociados.
              </p>
            </div>
          )}

          {/* Botones */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => router.push('/clientes')}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={(e) => {
                console.log('[EDITAR CLIENTE] Botón Guardar Cambios clickeado', e);
                e.preventDefault();
                e.stopPropagation();
                // Llamar directamente a handleSubmit
                const fakeEvent = {
                  preventDefault: () => {},
                  stopPropagation: () => {},
                } as React.FormEvent<HTMLFormElement>;
                handleSubmit(fakeEvent);
              }}
              onMouseDown={(e) => {
                console.log('[EDITAR CLIENTE] Botón mouseDown');
              }}
              className="px-6 py-2 text-gray-900 rounded-lg hover:opacity-90 transition-all cursor-pointer"
              style={{ backgroundColor: '#5DE1E5', zIndex: 1000, position: 'relative' }}
            >
              Guardar Cambios
            </button>
          </div>
        </form>
    </ProtectedLayout>
  );
}

