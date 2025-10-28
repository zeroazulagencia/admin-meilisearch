// Mapa de rutas a permisos requeridos
export const routePermissions: Record<string, string> = {
  '/': 'dashboard',
  '/admin-conocimiento': 'conocimiento',
  '/ejecuciones': 'ejecuciones',
  '/conversaciones': 'conversaciones',
  '/consumo-api': 'consumoApi',
  '/clientes': 'clientes',
  '/agentes': 'agentes',
};

// Verificar si el usuario tiene acceso a una ruta
export function hasAccessToRoute(route: string, permissions: any): boolean {
  if (!permissions) return false;
  
  // Admin tiene acceso a todo
  if (permissions.type === 'admin') return true;
  
  // Obtener el permiso requerido para la ruta
  const requiredPerm = routePermissions[route];
  if (!requiredPerm) return true; // Si no hay mapeo, permitir acceso
  
  // Verificar permisos de la sección
  const sectionPerms = permissions[requiredPerm];
  if (!sectionPerms) return false;
  
  return sectionPerms.viewOwn || sectionPerms.viewAll;
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

