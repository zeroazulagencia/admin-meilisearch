// Mapa de rutas a permisos requeridos
export const routePermissions: Record<string, string> = {
  '/dashboard': 'dashboard',
  '/admin-conocimiento': 'conocimiento',
  '/ejecuciones': 'ejecuciones',
  '/conversaciones': 'conversaciones',
  '/reportes': 'reportes',
  '/consumo-api': 'consumoApi',
  '/clientes': 'clientes',
  '/agentes': 'agentes',
};

// Verificar si el usuario tiene acceso a una ruta
export function hasAccessToRoute(route: string, permissions: any): boolean {
  if (!permissions) {
    console.log('[PERMISSIONS] No permissions found');
    return false;
  }
  
  // Admin tiene acceso a todo
  if (permissions.type === 'admin') {
    console.log('[PERMISSIONS] Admin user, allowing access');
    return true;
  }
  
  // Obtener el permiso requerido para la ruta
  const requiredPerm = routePermissions[route];
  if (!requiredPerm) {
    console.log('[PERMISSIONS] No mapping for route:', route);
    return true; // Si no hay mapeo, permitir acceso
  }
  
  console.log('[PERMISSIONS] Checking route:', route, 'requiring perm:', requiredPerm);
  
  // Verificar permisos de la sección
  const sectionPerms = permissions[requiredPerm];
  console.log('[PERMISSIONS] Section perms:', sectionPerms);
  
  if (!sectionPerms) {
    console.log('[PERMISSIONS] No section perms, denying');
    return false;
  }
  
  const hasAccess = sectionPerms.viewOwn || sectionPerms.viewAll;
  console.log('[PERMISSIONS] Has access:', hasAccess, 'viewOwn:', sectionPerms.viewOwn, 'viewAll:', sectionPerms.viewAll);
  
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

