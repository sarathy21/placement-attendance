import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import { ToastContainer } from '@/components/ui/toast';

export const metadata: Metadata = {
  title: 'KAHE Placement Attendance - Admin Portal',
  description: 'University Placement Attendance Management Admin Portal',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
        <Providers>
          {children}
          <ToastContainer />
        </Providers>
      </body>
    </html>
  );
}
