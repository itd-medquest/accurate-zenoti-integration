'use client';

import { useWorkspace } from '@/components/common/workspace-context';
import { SettingsView } from './settings';

export function SettingsPage() {
  const { branches, run, reloadBranches } = useWorkspace();
  return <SettingsView branches={branches} run={run} reload={reloadBranches} />;
}
