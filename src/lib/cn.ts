import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Last variant wins when composing the existing shared components with utility classes.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
