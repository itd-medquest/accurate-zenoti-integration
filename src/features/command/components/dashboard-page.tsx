'use client';

import { useRouter } from 'next/navigation';
import { workspacePath } from '@/lib/workspace-navigation';
import { CommandComingSoon } from './command-coming-soon';

export function CommandDashboardPage() {
  const router = useRouter();
  return <CommandComingSoon onDashboard={() => router.push(workspacePath('recap', 'dashboard'))} />;
}
