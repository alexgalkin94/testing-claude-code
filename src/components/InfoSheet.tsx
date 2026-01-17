'use client';

import { Drawer } from 'vaul';
import { useEffect, useState, ReactNode } from 'react';
import { X } from 'lucide-react';

interface InfoSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
}

export default function InfoSheet({
  open,
  onOpenChange,
  title,
  children,
}: InfoSheetProps) {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 768);
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  if (isDesktop) {
    if (!open) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="fixed inset-0 bg-black/60"
          onClick={() => onOpenChange(false)}
        />
        <div className="relative bg-zinc-900 rounded-2xl border border-zinc-800 p-6 w-full max-w-md max-h-[80vh] overflow-y-auto shadow-xl">
          <button
            onClick={() => onOpenChange(false)}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X size={20} />
          </button>
          <h2 className="text-lg font-semibold text-white mb-4 pr-8">
            {title}
          </h2>
          {children}
        </div>
      </div>
    );
  }

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/60 z-50" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 outline-none max-h-[85vh] flex flex-col">
          <div className="bg-zinc-900 rounded-t-2xl border-t border-zinc-800 flex flex-col flex-1 overflow-hidden">
            <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-zinc-700 my-4" />
            <div className="px-6 pb-8 overflow-y-auto flex-1">
              <Drawer.Title className="text-lg font-semibold text-white mb-4">
                {title}
              </Drawer.Title>
              {children}
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
