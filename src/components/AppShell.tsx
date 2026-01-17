'use client';

import { usePathname } from 'next/navigation';
import AuthGuard from './AuthGuard';
import BottomNav from './BottomNav';
import Sidebar from './Sidebar';
import { QueryProvider } from '@/lib/query-provider';
import { DataProvider } from '@/lib/data-store';
import { ServiceWorkerRegistration } from './ServiceWorkerRegistration';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  if (isLoginPage) {
    return <AuthGuard>{children}</AuthGuard>;
  }

  return (
    <AuthGuard>
      <ServiceWorkerRegistration />
      <QueryProvider>
      <DataProvider>
        {/* Desktop Layout */}
        <div className="hidden lg:flex min-h-screen">
          <Sidebar />
          <main className="flex-1 ml-56">
            <div className="max-w-5xl mx-auto">
              {children}
            </div>
          </main>
        </div>

        {/* Mobile Layout */}
        <div className="lg:hidden">
          <main className="min-h-screen pb-24 max-w-lg mx-auto">
            {children}
          </main>
          <BottomNav />
        </div>
      </DataProvider>
      </QueryProvider>
    </AuthGuard>
  );
}
