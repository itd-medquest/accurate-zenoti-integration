'use client';

import { useWorkspace } from '@/components/common/workspace-context';
import { UsersView } from './users';

export function UsersPage() {
  const { actor, run } = useWorkspace();
  return <UsersView actor={actor} run={run} />;
}
