import { easyRecapRoutes } from '@/features/easyrecap/routes';
import { commandRoutes } from '@/features/command/routes';
import type { Actor } from '@/types';
import type { ModuleId, View, WorkspaceRoutes } from '@/types/navigation';

const routes: Record<ModuleId, WorkspaceRoutes> = {
  recap: easyRecapRoutes,
  command: commandRoutes,
};
const views: View[] = [
  'dashboard',
  'imports',
  'receipts',
  'users',
  'settings',
  'audit',
  'account',
  'notifications',
];

export function workspacePath(module: ModuleId, view: View) {
  const workspace = routes[module].pages[view] ? routes[module] : routes.recap;
  return `${workspace.prefix}/${workspace.pages[view]}`;
}

export function workspaceLocation(pathname: string): { module: ModuleId; view: View } | null {
  const [, prefix, segment] = pathname.split('/');
  const module = prefix === 'easyrecap' ? 'recap' : prefix === 'command' ? 'command' : null;
  if (!module) return null;
  const view = views.find((view) => routes[module].pages[view] === segment);
  return view ? { module, view } : null;
}

export function canAccessView(actor: Actor, view: View) {
  if (['users', 'settings', 'audit'].includes(view)) return actor.role === 'super_admin';
  if (['imports', 'receipts'].includes(view))
    return actor.role === 'super_admin' || actor.role === 'finance';
  return true;
}

export const validRouteIdentifier = (value: string) => /^[a-zA-Z0-9_-]{1,100}$/.test(value);
