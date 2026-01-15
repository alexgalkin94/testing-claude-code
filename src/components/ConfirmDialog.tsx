'use client';

import { Drawer } from 'vaul';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  variant?: 'danger' | 'default';
}

export default function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Bestätigen',
  cancelLabel = 'Abbrechen',
  onConfirm,
  variant = 'default',
}: ConfirmDialogProps) {
  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/60 z-50" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 outline-none">
          <div className="bg-zinc-900 rounded-t-2xl border-t border-zinc-800">
            <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-zinc-700 my-4" />
            <div className="px-6 pb-8">
              <Drawer.Title className="text-lg font-semibold text-white mb-2">
                {title}
              </Drawer.Title>
              {description && (
                <Drawer.Description className="text-zinc-400 text-sm mb-6">
                  {description}
                </Drawer.Description>
              )}
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleConfirm}
                  className={`w-full py-3 px-4 rounded-xl font-medium transition-colors ${
                    variant === 'danger'
                      ? 'bg-red-500 hover:bg-red-600 text-white'
                      : 'bg-white hover:bg-zinc-200 text-black'
                  }`}
                >
                  {confirmLabel}
                </button>
                <button
                  onClick={() => onOpenChange(false)}
                  className="w-full py-3 px-4 rounded-xl font-medium bg-zinc-800 hover:bg-zinc-700 text-white transition-colors"
                >
                  {cancelLabel}
                </button>
              </div>
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
