'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const label = mounted
    ? `Gunakan mode ${resolvedTheme === 'dark' ? 'terang' : 'gelap'}`
    : 'Ubah tema tampilan';
  return (
    <Button
      variant="ghost"
      size="icon"
      disabled={!mounted}
      aria-label={label}
      title={label}
      aria-pressed={mounted && resolvedTheme === 'dark'}
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
    >
      <Moon data-icon="inline-start" className="dark:hidden" />
      <Sun data-icon="inline-start" className="hidden dark:block" />
    </Button>
  );
}
