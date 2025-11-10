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
  '/developers': 'developers',
};

// Verificar si el usuario tiene acceso a una ruta
export function hasAccessToRoute(route: string, permissions: any): boolean {
  if (!permissions) {
    console.log('[PERMISSIONS] No permissions found');
    return false;
  }
  
  // Admin tiene acceso a TODO sin restricciones
  if (permissions.type === 'admin') {
    console.log('[PERMISSIONS] Admin user, allowing access to:', route);
    return true;
  }
  
  // Verificar si puede hacer login
  if (permissions.canLogin === false) {
    console.log('[PERMISSIONS] Login disabled');
    return false;
  }
  
  // Clientes solo para admins
  if (route.startsWith('/clientes')) {
    if (permissions.type !== 'admin') {
      console.log('[PERMISSIONS] Clientes solo para admins');
      return false;
    }
    return true;
  }

  // DB Manager y Roadmap solo para admins
  if (route.startsWith('/db-manager') || route.startsWith('/roadmap')) {
    if (permissions.type !== 'admin') {
      console.log('[PERMISSIONS] DB Manager y Roadmap solo para admins');
      return false;
    }
    return true;
  }

  // Normalizar la ruta para manejar rutas dinámicas
  // Ejemplo: /agentes/1/editar -> /agentes
  let normalizedRoute = route;
  for (const [baseRoute] of Object.entries(routePermissions)) {
    if (route.startsWith(baseRoute)) {
      normalizedRoute = baseRoute;
      break;
    }
  }
  
  // Obtener el permiso requerido para la ruta
  const requiredPerm = routePermissions[normalizedRoute];
  if (!requiredPerm) {
    console.log('[PERMISSIONS] No mapping for route:', route, 'normalized:', normalizedRoute);
    return true; // Si no hay mapeo, permitir acceso
  }
  
  console.log('[PERMISSIONS] Checking route:', route, 'normalized:', normalizedRoute, 'requiring perm:', requiredPerm);
  
  // Verificar permisos del módulo (sistema completo con viewOwn/viewAll/editOwn/editAll)
  const modulePerms = permissions[requiredPerm];
  console.log('[PERMISSIONS] Module perms:', modulePerms);
  
  if (!modulePerms) {
    console.log('[PERMISSIONS] No module perms, denying');
    return false;
  }
  
  // Si tiene permiso de ver (propios o todos) o editar (propios o todos), tiene acceso
  // Usar comparación explícita con true para evitar undefined
  const hasAccess = modulePerms.viewOwn === true || 
                    modulePerms.viewAll === true || 
                    modulePerms.editOwn === true || 
                    modulePerms.editAll === true;
  console.log('[PERMISSIONS] Has access:', hasAccess, 'viewOwn:', modulePerms.viewOwn, 'viewAll:', modulePerms.viewAll, 'editOwn:', modulePerms.editOwn, 'editAll:', modulePerms.editAll);
  
  // Asegurar que siempre devolvemos un booleano
  return hasAccess === true;
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

// Encontrar la primera ruta a la que el usuario tiene acceso
export function findFirstAccessibleRoute(permissions: any): string | null {
  if (!permissions) return null;
  
  // Admin siempre puede ir al dashboard
  if (permissions.type === 'admin') {
    return '/dashboard';
  }
  
  // Verificar si puede hacer login
  if (permissions.canLogin === false) {
    return null;
  }
  
  // Orden de prioridad de rutas
  const routeOrder = [
    '/dashboard',
    '/agentes',
    '/ejecuciones',
    '/admin-conocimiento',
    '/reportes',
    '/conversaciones',
    '/whatsapp-manager',
    '/facturacion',
    '/consumo-api',
    '/developers'
  ];
  
  // Buscar la primera ruta a la que tiene acceso (sin logs excesivos)
  for (const route of routeOrder) {
    // Verificación rápida sin logs
    if (route.startsWith('/clientes') || route.startsWith('/db-manager') || route.startsWith('/roadmap')) {
      continue; // Estas rutas son solo para admins
    }
    
    const requiredPerm = routePermissions[route];
    if (!requiredPerm) continue;
    
    const modulePerms = permissions[requiredPerm];
    if (!modulePerms) continue;
    
    const hasAccess = modulePerms.viewOwn === true || 
                      modulePerms.viewAll === true || 
                      modulePerms.editOwn === true || 
                      modulePerms.editAll === true;
    
    if (hasAccess) {
      console.log('[PERMISSIONS] Primera ruta accesible encontrada:', route);
      return route;
    }
  }
  
  console.log('[PERMISSIONS] No se encontró ninguna ruta accesible');
  return null;
}

