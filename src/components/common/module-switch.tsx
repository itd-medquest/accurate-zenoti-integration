'use client';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';
export type ModuleId = 'recap' | 'command';
const modules = [
  { id: 'recap', name: 'Easy Recap', subtitle: 'Invoice & Reconciliation', letter: 'E' },
  { id: 'command', name: 'Command', subtitle: 'Executive Insights', letter: 'C' },
] as const;
export function ModuleSwitch({
  value,
  onChange,
  collapsed = false,
}: {
  value: ModuleId;
  onChange: (value: ModuleId) => void;
  collapsed?: boolean;
}) {
  const active = modules.find((module) => module.id === value)!;
  return (
    <div
      className={cn(
        'module-switch mb-7',
        collapsed &&
          'min-[761px]:flex min-[761px]:justify-center min-[761px]:mb-5 min-[761px]:[&_.module-details]:hidden min-[761px]:[&_.module-chevron]:hidden',
      )}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size={collapsed ? 'icon' : 'default'}
            className={cn(
              'h-auto min-h-14 w-full justify-start gap-3 overflow-hidden px-3 py-3',
              collapsed &&
                'min-[761px]:size-12 min-[761px]:min-h-12 min-[761px]:justify-center min-[761px]:gap-0 min-[761px]:p-0',
            )}
            aria-label={`Pilih modul: ${active.name}`}
          >
            <Avatar>
              <AvatarFallback>{active.letter}</AvatarFallback>
            </Avatar>
            <span className="module-details flex min-w-0 flex-1 flex-col items-start gap-0.5">
              <strong>{active.name}</strong>
              <small className="text-muted-foreground">{active.subtitle}</small>
            </span>
            <ChevronDown className="module-chevron" data-icon="inline-end" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          aria-label="Modul platform"
          aria-labelledby={undefined}
          side={collapsed ? 'right' : 'bottom'}
          sideOffset={8}
          className="w-72 max-w-[calc(100vw-2rem)]"
        >
          <DropdownMenuLabel>Ruang kerja</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup
            value={value}
            onValueChange={(next) => {
              if (next === 'recap' || next === 'command') onChange(next);
            }}
          >
            {modules.map((module) => (
              <DropdownMenuRadioItem
                key={module.id}
                value={module.id}
                className="gap-3 py-3 pl-3 pr-9"
              >
                <Avatar>
                  <AvatarFallback>{module.letter}</AvatarFallback>
                </Avatar>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <strong className="whitespace-nowrap">{module.name}</strong>
                  <small className="whitespace-normal text-muted-foreground">
                    {module.subtitle}
                  </small>
                </span>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
