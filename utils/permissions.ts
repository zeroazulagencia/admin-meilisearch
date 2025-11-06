// Mapa de rutas a permisos requeridos
export const routePermissions: Record<string, string> = {
  '/dashboard': 'dashboard',
  '/admin-conocimiento': 'adminConocimiento',
  '/ejecuciones': 'ejecuciones',
  '/conversaciones': 'conversaciones',
  '/reportes': 'reportes',
  '/roadmap': 'roadmap',
  '/whatsapp-manager': 'whatsappManager',
  '/facturacion': 'facturacion',
  '/db-manager': 'dbManager',
  '/consumo-api': 'consumoAPI',
  '/clientes': 'clientes',
  '/agentes': 'agentes',
};

// Verificar si el usuario tiene acceso a una ruta
export function hasAccessToRoute(route: string, permissions: any): boolean {
  if (!permissions) {
    console.log('[PERMISSIONS] No permissions found');
    return false;
  }
  
  // Verificar si puede hacer login
  if (permissions.canLogin === false) {
    console.log('[PERMISSIONS] Login disabled');
    return false;
  }
  
  // Obtener el permiso requerido para la ruta
  const requiredPerm = routePermissions[route];
  if (!requiredPerm) {
    console.log('[PERMISSIONS] No mapping for route:', route);
    return true; // Si no hay mapeo, permitir acceso
  }
  
  console.log('[PERMISSIONS] Checking route:', route, 'requiring perm:', requiredPerm);
  
  // Verificar permisos del módulo (nuevo sistema simplificado)
  const modulePerms = permissions[requiredPerm];
  console.log('[PERMISSIONS] Module perms:', modulePerms);
  
  if (!modulePerms) {
    console.log('[PERMISSIONS] No module perms, denying');
    return false;
  }
  
  // Si tiene permiso de ver o editar, tiene acceso
  const hasAccess = modulePerms.view || modulePerms.edit;
  console.log('[PERMISSIONS] Has access:', hasAccess, 'view:', modulePerms.view, 'edit:', modulePerms.edit);
  
  return hasAccess;
}

// Obtener permisos del localStorage
export function getPermissions(): any {
  if (typeof window === 'undefined') return null;
  
  try {
    const perms = localStorage.getItem('admin-permissions');
    if (perms) {
      return JSON.parse(perms);
    }
  } catch (e) {
    console.error('Error loading permissions:', e);
  }
  
  return null;
}

// Obtener ID del usuario del localStorage
export function getUserId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('admin-user-id');
}

