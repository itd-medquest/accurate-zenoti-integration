import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from '@/components/common/theme-provider';
import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'intgrte - Connecting What Matters.',
  description: 'Internal Network for Transactions, Governance, Reporting, Tracking & Efficiency.',
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          {children}
          <Toaster position="top-right" offset={24} mobileOffset={16} />
        </ThemeProvider>
      </body>
    </html>
  );
}
