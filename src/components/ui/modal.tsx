'use client';
import { cn } from '@/lib/cn';
import { X } from 'lucide-react';
import { useRef } from 'react';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from './alert-dialog';
import { Button } from './button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './dialog';

/** Shared invoice dialog; Radix owns focus trapping, scroll locking and dismissal. */
export function Modal({
  title,
  children,
  onClose,
  wide = false,
  className,
  destructive = false,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
  className?: string;
  destructive?: boolean;
}) {
  const previousFocus = useRef<HTMLElement | null>(null);
  const Root = destructive ? AlertDialog : Dialog;
  const Content = destructive ? AlertDialogContent : DialogContent;
  const Header = destructive ? AlertDialogHeader : DialogHeader;
  const Title = destructive ? AlertDialogTitle : DialogTitle;
  const Description = destructive ? AlertDialogDescription : DialogDescription;
  return (
    <Root
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Content
        {...(!destructive ? { showCloseButton: false } : {})}
        className={cn(
          'modal block w-[min(480px,calc(100vw-2rem))] max-h-[90dvh] gap-0 overflow-auto p-0 sm:max-w-none mobile:max-h-[94dvh]',
          wide && 'wide',
          className,
        )}
        onOpenAutoFocus={() => {
          previousFocus.current =
            document.activeElement instanceof HTMLElement ? document.activeElement : null;
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          if (previousFocus.current?.isConnected) previousFocus.current.focus();
        }}
      >
        <Header className="modal-head flex flex-row items-center justify-between gap-4 border-b px-6 py-4 mobile:px-4">
          <Title>{title}</Title>
          {destructive ? (
            <AlertDialogCancel variant="ghost" size="icon" aria-label="Tutup">
              <X data-icon="inline-start" />
            </AlertDialogCancel>
          ) : (
            <DialogClose asChild>
              <Button variant="ghost" size="icon" aria-label="Tutup">
                <X data-icon="inline-start" />
              </Button>
            </DialogClose>
          )}
        </Header>
        <Description className="sr-only">
          Periksa informasi dan perubahan sebelum melanjutkan.
        </Description>
        {children}
      </Content>
    </Root>
  );
}
