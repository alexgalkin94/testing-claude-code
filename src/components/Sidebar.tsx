'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Scale,
  Camera,
  ShoppingCart,
  Settings,
  LogOut,
} from 'lucide-react';
import { signOut, useSession } from '@/lib/auth-client';

const navItems = [
  { href: '/', icon: LayoutDashboard, label: 'Heute' },
  { href: '/weight', icon: Scale, label: 'Gewicht' },
  { href: '/photos', icon: Camera, label: 'Fotos' },
  { href: '/shopping', icon: ShoppingCart, label: 'Einkauf' },
  { href: '/settings', icon: Settings, label: 'Setup' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();

  const handleLogout = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-56 bg-zinc-950 border-r border-zinc-800 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-zinc-800">
        <h1 className="text-xl font-semibold tracking-tight">CutBoard</h1>
        <p className="text-xs text-zinc-500 mt-0.5">Cutting Phase Tracker</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {navItems.map(({ href, icon: Icon, label }) => {
            const isActive = pathname === href;
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-zinc-800 text-white'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                  }`}
                >
                  <Icon size={18} />
                  <span className="text-sm font-medium">{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-zinc-800">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-medium">
            {session?.user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{session?.user?.name || 'User'}</p>
            <p className="text-xs text-zinc-500 truncate">{session?.user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors text-sm"
        >
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
