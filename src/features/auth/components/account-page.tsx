'use client';

import { useWorkspace } from '@/components/common/workspace-context';
import { PasswordForm } from './password-form';

export function AccountPage() {
  const { run } = useWorkspace();
  return <PasswordForm run={run} />;
}
