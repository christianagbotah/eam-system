import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Providers from '@/components/Providers';
import { initializeMonitoring } from '@/lib/monitoring';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'iFactory EAM System - Enterprise Asset Management',
  description: 'World-Class Enterprise Asset Management System with IoT, AI, and Mobile Support',
  manifest: '/manifest.json',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#2563eb',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Initialize enterprise monitoring
  if (typeof window !== 'undefined') {
    initializeMonitoring();
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} overflow-x-hidden`} suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
