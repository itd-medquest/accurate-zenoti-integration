export type View =
  | 'dashboard'
  | 'imports'
  | 'receipts'
  | 'users'
  | 'settings'
  | 'audit'
  | 'account'
  | 'notifications';

export type ModuleId = 'recap' | 'command';
export type WorkspaceRoutes = {
  prefix: string;
  pages: Partial<Record<View, string>>;
};
