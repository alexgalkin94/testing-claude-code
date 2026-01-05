'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useSession } from '@/lib/auth-client';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isPending && !session && pathname !== '/login') {
      router.push('/login');
    }
  }, [session, isPending, pathname, router]);

  // Skip auth check on login page
  if (pathname === '/login') {
    return <>{children}</>;
  }

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <Loader2 size={32} className="animate-spin text-zinc-500" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return <>{children}</>;
}
