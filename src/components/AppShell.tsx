'use client';

import { usePathname } from 'next/navigation';
import AuthGuard from './AuthGuard';
import BottomNav from './BottomNav';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  return (
    <AuthGuard>
      <main className="min-h-screen pb-20 max-w-lg mx-auto">
        {children}
      </main>
      {!isLoginPage && <BottomNav />}
    </AuthGuard>
  );
}
