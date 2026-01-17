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
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-950/95 backdrop-blur-xl border-t border-zinc-800/50"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {/* 49pt = 49px content height (Apple HIG standard) */}
      <div className="flex justify-around items-stretch h-[49px] max-w-lg mx-auto">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              prefetch={true}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors active:opacity-70 ${
                isActive ? 'text-white' : 'text-zinc-500'
              }`}
            >
              {/* 25pt icon size per Apple HIG */}
              <Icon size={25} strokeWidth={isActive ? 2 : 1.5} />
              {/* 10pt SF Medium per Apple HIG */}
              <span className="text-[10px] font-medium leading-none">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
