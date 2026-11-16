'use client';
import { CheckCircle2, CircleAlert, X } from 'lucide-react';
import { useEffect, useId, useRef } from 'react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from './alert';
import { Button } from './button';

export function Toast({
  message,
  onClose,
  error = false,
  duration = 5000,
}: {
  message: string;
  onClose: () => void;
  error?: boolean;
  duration?: number;
}) {
  const id = useId();
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    toast.custom(
      () => (
        <Alert
          variant={error ? 'destructive' : 'success'}
          className="flex w-full items-center gap-3 shadow-lg"
          role={error ? 'alert' : 'status'}
          aria-atomic="true"
        >
          {error ? <CircleAlert /> : <CheckCircle2 />}
          <AlertDescription className="flex-1">{message}</AlertDescription>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Tutup notifikasi"
            onClick={() => {
              toast.dismiss(id);
              close.current();
            }}
          >
            <X data-icon="inline-start" />
          </Button>
        </Alert>
      ),
      { id, duration, onAutoClose: () => close.current(), onDismiss: () => close.current() },
    );
    return () => {
      toast.dismiss(id);
    };
  }, [id, message, error, duration]);
  return null;
}
