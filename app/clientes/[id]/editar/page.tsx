'use client';

import { useState, useEffect, useMemo } from 'react';
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

const AgentAvatar = ({ photo, name }: { photo?: string | null; name: string }) => {
  const [imgError, setImgError] = useState(false);
  if (photo && !imgError) {
    return (
      <img
        src={photo}
        alt={name}
        className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
        onError={() => setImgError(true)}
      />
    );
  }
  return (
    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#5DE1E5] to-[#4BC5C9] flex items-center justify-center border-2 border-gray-200">
      <span className="text-white font-semibold text-xl">{name.charAt(0).toUpperCase()}</span>
    </div>
  );
};

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
  const [userRole, setUserRole] = useState<'admin' | 'cliente'>('cliente');
  const [isEditingAdmin, setIsEditingAdmin] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [currentClient, setCurrentClient] = useState<Client | null>(null);
  const [associatedAgents, setAssociatedAgents] = useState<any[]>([]);
  const [agentMonthlyValues, setAgentMonthlyValues] = useState<{[key: number]: string}>({});
  const [savingAgentIds, setSavingAgentIds] = useState<number[]>([]);
  const [permissions, setPermissions] = useState<any>({});
  const [alertModal, setAlertModal] = useState<{ isOpen: boolean; title?: string; message: string; type?: 'success' | 'error' | 'info' | 'warning' }>({
    isOpen: false,
    message: '',
    type: 'info',
  });
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    // Verificar si el usuario que está editando es admin
    const permissions = getPermissions();
    if (permissions) {
      const userIsAdmin = permissions.type === 'admin';
      setIsEditingAdmin(userIsAdmin);
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
            
            // Establecer el rol del cliente
            if (perms.type === 'admin') {
              setUserRole('admin');
            } else {
              setUserRole('cliente');
            }
            
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
      
      // Preparar permisos con el tipo de rol
      const permissionsToSave = {
        ...permissions,
        type: userRole
      };
      
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
          permissions: permissionsToSave
        })
      });
      
      const data = await res.json();
      console.log('[EDITAR CLIENTE] Respuesta del servidor:', data);
      
      if (data.ok) {
        console.log('[EDITAR CLIENTE] Mostrando notice de éxito');
        setAlertModal({
          isOpen: true,
          title: 'Éxito',
          message: 'Cliente actualizado correctamente',
          type: 'success',
        });
        console.log('[EDITAR CLIENTE] Estado alertModal actualizado:', { isOpen: true, type: 'success' });
        // Recargar datos del cliente para mostrar cambios actualizados
        const loadClient = async () => {
          try {
            const res = await fetch(`/api/clients/${currentClient.id}`);
            const data = await res.json();
            if (data.ok && data.client) {
              const client = data.client;
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
                if (perms.type === 'admin') {
                  setUserRole('admin');
                } else {
                  setUserRole('cliente');
                }
                setPermissions(perms);
              } catch {
                setPermissions({});
              }
            }
          } catch (err) {
            console.error('Error recargando cliente:', err);
          }
        };
        loadClient();
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

  // Módulos exclusivos de admin (solo se muestran si el cliente es admin)
  const ADMIN_ONLY_MODULES = ['dbManager', 'roadmap', 'clientes', 'ejecuciones', 'whatsappManager', 'consumoAPI'];
  
  // Verificar si el cliente actual es admin (usando useMemo para recalcular cuando cambie currentClient o permissions)
  const isClientAdmin = useMemo(() => {
    if (!currentClient) return false;
    
    try {
      const clientPerms = typeof currentClient.permissions === 'string' 
        ? JSON.parse(currentClient.permissions) 
        : (currentClient.permissions || {});
      
      return clientPerms?.type === 'admin';
    } catch {
      return false;
    }
  }, [currentClient, permissions]);
  
  const MODULES = useMemo(() => {
    const allModules = [
      { key: 'dashboard', label: 'Dashboard', onlyView: true },
      { key: 'clientes', label: 'Clientes', onlyView: true },
      { key: 'agentes', label: 'Agentes', onlyView: true },
      { key: 'modulos', label: 'Módulos', onlyView: false },
      { key: 'ejecuciones', label: 'Ejecuciones', onlyView: true },
      { key: 'adminConocimiento', label: 'Admin Conocimiento', onlyView: false },
      { key: 'reportes', label: 'Reportes', onlyView: true },
      { key: 'conversaciones', label: 'Conversaciones', onlyView: true },
      { key: 'whatsappManager', label: 'WhatsApp Manager', onlyView: true },
      { key: 'facturacion', label: 'Facturación', onlyView: true },
      { key: 'consumoAPI', label: 'Consumo API', onlyView: true },
      { key: 'developers', label: 'Developers', onlyView: true },
      { key: 'dbManager', label: 'DB Manager', onlyView: true }
    ];
    
    // Si el cliente es admin, mostrar todos los módulos
    // Si no es admin, filtrar los módulos exclusivos de admin
    return allModules.filter(module => {
      return isClientAdmin || !ADMIN_ONLY_MODULES.includes(module.key);
    });
  }, [isClientAdmin]);

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({ ...formData, clave: password });
  };

  // Save monthly value for a specific agent
  const saveAgentMonthlyValue = async (agentId: number, value: number) => {
    try {
      setSavingAgentIds(prev => [...prev, agentId]);
      const res = await fetch(`/api/agents/${agentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monthly_value_usd: value })
      });
      const data = await res.json();
      if (data.ok) {
        // Refresh associated agents list
        const resAgents = await fetch('/api/agents');
        const dataAgents = await resAgents.json();
        if (dataAgents.ok && dataAgents.agents && currentClient) {
          const agentsForClient = dataAgents.agents.filter((a: any) => a.client_id === parseInt(currentClient.id.toString()));
          setAssociatedAgents(agentsForClient);
        }
      } else {
        console.error('Error saving agent monthly value:', data.error);
      }
    } catch (e) {
      console.error('Error saving agent monthly value:', e);
    } finally {
      setSavingAgentIds(prev => prev.filter(id => id !== agentId));
    }
  };

  // Update local agent monthly value in state
  const updateLocalAgentValue = (agentId: number, value: number) => {
    setAssociatedAgents(prev => 
      prev.map(a => a.id === agentId ? { ...a, monthly_value_usd: value } : a)
    );
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
          onClose={() => setAlertModal({ isOpen: false, message: '', type: 'info' })}
          title={alertModal.title}
          message={alertModal.message}
          type={alertModal.type}
        />
      </ProtectedLayout>
    );
  }

  return (
    <ProtectedLayout>
      <div className="mb-6 flex justify-between items-center">
        <div>
        <h1 className="text-2xl font-bold text-gray-900">Editar Cliente</h1>
        <p className="mt-2 text-gray-600">Actualiza la información del cliente</p>
        </div>
        <button
          onClick={() => router.push('/clientes')}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Volver a clientes
        </button>
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

              {/* Select de Rol - Solo visible para admin */}
              {isEditingAdmin && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rol *
                  </label>
                  <select
                    value={userRole}
                    onChange={(e) => setUserRole(e.target.value as 'admin' | 'cliente')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                    style={{ '--tw-ring-color': '#5DE1E5' } as React.CSSProperties & { '--tw-ring-color': string }}
                  >
                    <option value="cliente">Cliente</option>
                    <option value="admin">Admin</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Los usuarios Admin tienen acceso completo al sistema
                  </p>
                </div>
              )}

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

          {/* Permisos - Solo mostrar si NO es admin */}
          {!isClientAdmin && (
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
          )}

          {/* Agentes Asociados */}
          {associatedAgents.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Agentes Asociados ({associatedAgents.length})
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {associatedAgents.map((agent) => {
                  const isSaving = savingAgentIds.includes(agent.id);
                  const displayValue = agentMonthlyValues[agent.id] ?? (agent.monthly_value_usd?.toString() || '');
                  
                  return (
                    <div 
                      key={agent.id} 
                      className="border-2 border-gray-200 rounded-lg p-4 transition-colors"
                      style={{ '--hover-border': '#5DE1E5' } as React.CSSProperties}
                      onMouseEnter={(e) => e.currentTarget.style.borderColor = '#5DE1E5'}
                      onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
                    >
                      {/* Card header — clickable to navigate to agent edit */}
                      <button
                        type="button"
                        onClick={() => router.push(`/agentes/${agent.id}/editar`)}
                        className="flex items-center gap-3 w-full text-left"
                      >
                        <div className="flex-shrink-0">
                          <AgentAvatar photo={agent.photo} name={agent.name} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate">{agent.name}</h3>
                          {agent.description && (
                            <p className="text-sm text-gray-500 line-clamp-2">{agent.description}</p>
                          )}
                          {agent.conversation_agent_name && (
                            <p className="text-xs text-gray-400 mt-1">ID: {agent.conversation_agent_name}</p>
                          )}
                        </div>
                        <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                      
                      {/* Monthly Value Field */}
                      <div className="border-t border-gray-100 pt-3 mt-3">
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          Valor mensual (USD)
                        </label>
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="0.00"
                              value={displayValue}
                              onChange={(e) => {
                                setAgentMonthlyValues(prev => ({ ...prev, [agent.id]: e.target.value }));
                              }}
                              onBlur={() => {
                                const val = parseFloat(displayValue);
                                if (!isNaN(val) && val !== (agent.monthly_value_usd || 0)) {
                                  updateLocalAgentValue(agent.id, val);
                                  saveAgentMonthlyValue(agent.id, val);
                                } else {
                                  // Revert to DB value
                                  setAgentMonthlyValues(prev => {
                                    const next = { ...prev };
                                    delete next[agent.id];
                                    return next;
                                  });
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const val = parseFloat(displayValue);
                                  if (!isNaN(val) && val !== (agent.monthly_value_usd || 0)) {
                                    updateLocalAgentValue(agent.id, val);
                                    saveAgentMonthlyValue(agent.id, val);
                                  } else {
                                    setAgentMonthlyValues(prev => {
                                      const next = { ...prev };
                                      delete next[agent.id];
                                      return next;
                                    });
                                  }
                                }
                              }}
                              className="w-full pl-6 pr-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:border-transparent"
                              style={{ '--tw-ring-color': '#5DE1E5' } as React.CSSProperties & { '--tw-ring-color': string }}
                            />
                          </div>
                          {isSaving && (
                            <svg className="animate-spin h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                            </svg>
                          )}
                        </div>
                        {(agent.monthly_value_usd && parseFloat(agent.monthly_value_usd) > 0) && !isSaving && (
                          <p className="text-xs text-green-600 mt-1">
                            {displayValue ? `$${parseFloat(displayValue).toFixed(2)}` : `$${parseFloat(agent.monthly_value_usd).toFixed(2)}`} USD/mes
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
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

        {/* Modal de alertas */}
        <NoticeModal
          isOpen={alertModal.isOpen}
          onClose={() => setAlertModal({ isOpen: false, message: '', type: 'info' })}
          title={alertModal.title}
          message={alertModal.message}
          type={alertModal.type}
        />
    </ProtectedLayout>
  );
}

