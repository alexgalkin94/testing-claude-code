'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Scale,
  Camera,
  ShoppingCart,
  Settings,
} from 'lucide-react';

const navItems = [
  { href: '/', icon: LayoutDashboard, label: 'Heute' },
  { href: '/weight', icon: Scale, label: 'Gewicht' },
  { href: '/photos', icon: Camera, label: 'Fotos' },
  { href: '/shopping', icon: ShoppingCart, label: 'Einkauf' },
  { href: '/settings', icon: Settings, label: 'Setup' },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#0a0a0f]/90 backdrop-blur-lg border-t border-white/10">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto px-2">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center justify-center px-4 py-1 rounded-lg ${
                isActive
                  ? 'text-[#8b5cf6]'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Icon
                size={22}
                className={isActive ? 'drop-shadow-[0_0_8px_rgba(139,92,246,0.5)]' : ''}
              />
              <span className="text-[10px] mt-1 font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
