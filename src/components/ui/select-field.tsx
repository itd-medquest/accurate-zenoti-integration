'use client';

import type { ComponentProps, ReactNode } from 'react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select';

// Encode every value so empty filters remain selectable without colliding with real IDs.
const encode = (value: string | number) => `option:${value}`;

type SelectFieldProps = Pick<
  ComponentProps<typeof SelectTrigger>,
  | 'id'
  | 'className'
  | 'aria-label'
  | 'aria-labelledby'
  | 'aria-describedby'
  | 'aria-invalid'
  | 'disabled'
  | 'size'
  | 'variant'
  | 'title'
> & {
  value: string | number;
  onValueChange: (value: string) => void;
  name?: string;
  required?: boolean;
  icon?: ReactNode;
  children: ReactNode;
};

function SelectField({
  value,
  onValueChange,
  name,
  required,
  disabled,
  children,
  icon,
  ...trigger
}: SelectFieldProps) {
  return (
    <Select
      value={encode(value)}
      onValueChange={(next) => onValueChange(next.slice(7))}
      name={name}
      required={required}
      disabled={disabled}
    >
      <SelectTrigger {...trigger}>
        {icon}
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper" align="start" sideOffset={6} collisionPadding={12}>
        <SelectGroup>{children}</SelectGroup>
      </SelectContent>
    </Select>
  );
}

function SelectFieldOption({
  value,
  ...props
}: Omit<ComponentProps<typeof SelectItem>, 'value'> & { value: string | number }) {
  return <SelectItem value={encode(value)} data-value={String(value)} {...props} />;
}

export { SelectField, SelectFieldOption };
