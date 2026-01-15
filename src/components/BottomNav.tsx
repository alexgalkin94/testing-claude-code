'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Scale,
  Camera,
  ShoppingCart,
  Settings,
  UtensilsCrossed,
} from 'lucide-react';
import { useData } from '@/lib/data-store';

const allNavItems = [
  { href: '/', icon: LayoutDashboard, label: 'Heute' },
  { href: '/plans', icon: UtensilsCrossed, label: 'Pläne' },
  { href: '/weight', icon: Scale, label: 'Gewicht' },
  { href: '/photos', icon: Camera, label: 'Fotos' },
  { href: '/shopping', icon: ShoppingCart, label: 'Einkauf' },
  { href: '/settings', icon: Settings, label: 'Setup' },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { data } = useData();

  const navItems = allNavItems.filter(item =>
    item.href !== '/photos' || data.profile.showPhotosTab !== false
  );

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-950/90 backdrop-blur-lg border-t border-zinc-800">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto px-2">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center justify-center px-4 py-1 rounded-lg transition-colors ${
                isActive
                  ? 'text-white'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Icon size={22} />
              <span className="text-[10px] mt-1 font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
