'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Loader2 } from 'lucide-react';
import Card from '@/components/Card';
import Button from '@/components/Button';

export default function LoginPage() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });

      if (response.ok) {
        router.push('/');
        router.refresh();
      } else {
        setError('Falscher PIN');
        setPin('');
      }
    } catch (err) {
      setError('Verbindungsfehler');
    }

    setLoading(false);
  };

  const handlePinInput = (digit: string) => {
    if (pin.length < 6) {
      setPin(prev => prev + digit);
      setError('');
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
    setError('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-zinc-950">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center">
            <Lock size={28} className="text-zinc-300" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">CutBoard</h1>
          <p className="text-zinc-500 text-sm mt-1">Gib deinen PIN ein</p>
        </div>

        <Card className="mb-6">
          <form onSubmit={handleSubmit}>
            {/* PIN Display */}
            <div className="flex justify-center gap-3 mb-6">
              {[0, 1, 2, 3].map(i => (
                <div
                  key={i}
                  className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl font-bold transition-all ${
                    pin.length > i
                      ? 'bg-white text-black'
                      : 'bg-zinc-800 text-zinc-600'
                  }`}
                >
                  {pin.length > i ? '•' : ''}
                </div>
              ))}
            </div>

            {/* Error */}
            {error && (
              <p className="text-red-400 text-sm text-center mb-4">{error}</p>
            )}

            {/* Number Pad */}
            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, 'del'].map((item, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    if (item === 'del') handleBackspace();
                    else if (item !== null) handlePinInput(item.toString());
                  }}
                  disabled={item === null}
                  className={`h-14 rounded-xl font-medium text-lg transition-all ${
                    item === null
                      ? 'invisible'
                      : item === 'del'
                      ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                      : 'bg-zinc-800 text-white hover:bg-zinc-700 active:scale-95'
                  }`}
                >
                  {item === 'del' ? '←' : item}
                </button>
              ))}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={pin.length < 4 || loading}
              className="w-full mt-6"
            >
              {loading ? (
                <><Loader2 size={18} className="animate-spin mr-2" /> Prüfe...</>
              ) : (
                'Entsperren'
              )}
            </Button>
          </form>
        </Card>

        <p className="text-center text-xs text-zinc-600">
          Deine Daten sind sicher verschlüsselt
        </p>
      </div>
    </div>
  );
}
