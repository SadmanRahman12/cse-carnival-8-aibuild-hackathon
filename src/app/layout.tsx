import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CampusOS — Intelligent University Operating System',
  description: 'A unified campus platform with live persistent data management and an autonomous tool-calling AI agent.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-slate-900 text-slate-100 antialiased selection:bg-emerald-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
