'use client';
import { getSession } from '@/features/auth/services/auth.service';
import type { Actor } from '@/types';
import { useCallback, useEffect, useState } from 'react';
import { getCurrentActor } from '../services/auth.service';

export function useSession() {
  const [actor, setActor] = useState<Actor | null>(null);
  const [checking, setChecking] = useState(true);
  const [authError, setAuthError] = useState('');
  const checkAuth = useCallback(async () => {
    try {
      setAuthError('');
      const session = await getSession();
      if (session.error)
        throw new Error('Backend tidak dapat dihubungi. Pastikan server API aktif.');
      if (session.data) setActor(await getCurrentActor());
      else setActor(null);
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : 'Koneksi gagal.');
      setActor(null);
    } finally {
      setChecking(false);
    }
  }, []);
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);
  return { actor, setActor, checking, authError, setAuthError, checkAuth };
}
