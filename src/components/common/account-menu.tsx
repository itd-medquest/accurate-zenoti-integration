'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { roleLabels } from '@/lib/labels';
import type { Actor } from '@/types';
import { ChevronDown, KeyRound, LogOut } from 'lucide-react';

export function AccountMenu({
  actor,
  busy,
  onAccount,
  onSignOut,
}: {
  actor: Actor;
  busy: boolean;
  onAccount: () => void;
  onSignOut: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="h-10 gap-2 pl-1.5 pr-3 mobile:pr-1.5"
          aria-label={`Menu profil ${actor.name}`}
          disabled={busy}
        >
          <Avatar size="sm">
            <AvatarFallback>{actor.name.slice(0, 1)}</AvatarFallback>
          </Avatar>
          <span className="max-w-28 truncate text-xs mobile:hidden">{actor.name}</span>
          <ChevronDown data-icon="inline-end" className="mobile:hidden" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56" sideOffset={8}>
        <DropdownMenuLabel className="flex flex-col gap-1 px-2 py-2">
          <span className="truncate">{actor.name}</span>
          <span className="text-xs font-normal text-muted-foreground">
            {roleLabels[actor.role]}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onSelect={onAccount} disabled={busy}>
            <KeyRound />
            Akun Saya
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onSignOut} disabled={busy} variant="destructive">
            <LogOut />
            Logout
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
