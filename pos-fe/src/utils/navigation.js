export const normalizePathname = (pathname) => (
  String(pathname || '/').split(/[?#]/, 1)[0].replace(/\/+$/, '') || '/'
);

export const isRouteActive = (pathname, href) => {
  const current = normalizePathname(pathname);
  const target = normalizePathname(href);
  return current === target || (target !== '/' && current.startsWith(`${target}/`));
};

export const INVENTORY_ROUTES = ['/products', '/categories', '/stock'];
export const isManagementRole = role => ['ADMIN', 'OWNER'].includes(role);
const STAFF_ROUTES = ['/', '/pos', ...INVENTORY_ROUTES, '/transactions', '/customers', '/shifts', '/settings', '/license'];

export const canAccessPage = (role, pathname) => (
  isManagementRole(role) || (role === 'CASHIER' && STAFF_ROUTES.some(path => isRouteActive(pathname, path)))
);
