export type AuditLog = {
  id: string;
  actorId: string | null;
  action: string;
  entityId: string | null;
  createdAt: string;
  details: unknown;
};
