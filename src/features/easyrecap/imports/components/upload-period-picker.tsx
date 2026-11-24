'use client';
import type { ComponentProps } from 'react';
import { DateRangePicker } from '@/components/ui/date-range-picker';

export function UploadPeriodPicker(
  props: Omit<ComponentProps<typeof DateRangePicker>, 'id' | 'heading'>,
) {
  return <DateRangePicker {...props} id="history-period" heading="Periode upload" />;
}
