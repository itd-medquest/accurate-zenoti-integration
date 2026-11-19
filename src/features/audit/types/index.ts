export type AuditLog = {
  id: string;
  actorId: string | null;
  action: string;
  entityId: string | null;
  createdAt: string;
  details: unknown;
};

export type AuditPage = {
  items: AuditLog[];
  total: number;
  page: number;
  pageSize: number;
};
