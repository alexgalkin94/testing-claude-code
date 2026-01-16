'use client';

import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';

export function ServiceWorkerRegistration() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          setRegistration(reg);
          console.log('SW registered:', reg.scope);

          // Check for updates on load
          reg.update();

          // Check for updates every 2 minutes
          const interval = setInterval(() => {
            reg.update();
          }, 2 * 60 * 1000);

          // Handle updates
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New version available
                  setUpdateAvailable(true);
                }
              });
            }
          });

          return () => clearInterval(interval);
        })
        .catch((error) => {
          console.error('SW registration failed:', error);
        });

      // Handle controller change
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
    }
  }, []);

  const handleUpdate = () => {
    if (registration?.waiting) {
      registration.waiting.postMessage('skipWaiting');
    }
    setUpdateAvailable(false);
  };

  if (!updateAvailable) return null;

  return (
    <div className="fixed top-4 left-4 right-4 z-50 animate-in slide-in-from-top">
      <div className="bg-emerald-600 text-white rounded-xl p-4 shadow-lg flex items-center gap-3 max-w-md mx-auto">
        <RefreshCw size={20} />
        <div className="flex-1">
          <p className="font-medium text-sm">Neue Version verfügbar</p>
        </div>
        <button
          onClick={handleUpdate}
          className="bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
        >
          Aktualisieren
        </button>
      </div>
    </div>
  );
}
