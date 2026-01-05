'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Loader2, User } from 'lucide-react';
import Card from '@/components/Card';
import Button from '@/components/Button';
import { signIn, signUp } from '@/lib/auth-client';

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        const result = await signUp.email({
          email,
          password,
          name: name || email.split('@')[0],
        });

        if (result.error) {
          setError(result.error.message || 'Registrierung fehlgeschlagen');
        } else {
          router.push('/');
          router.refresh();
        }
      } else {
        const result = await signIn.email({
          email,
          password,
        });

        if (result.error) {
          setError(result.error.message || 'Login fehlgeschlagen');
        } else {
          router.push('/');
          router.refresh();
        }
      }
    } catch (err) {
      setError('Verbindungsfehler');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-zinc-950">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center">
            <Lock size={28} className="text-zinc-300" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">CutBoard</h1>
          <p className="text-zinc-500 text-sm mt-1">
            {isSignUp ? 'Account erstellen' : 'Melde dich an'}
          </p>
        </div>

        <Card className="mb-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="block text-sm text-zinc-400 mb-1.5">Name</label>
                <div className="relative">
                  <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Dein Name"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-10 pr-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm text-zinc-400 mb-1.5">Email</label>
              <div className="relative">
                <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="deine@email.de"
                  required
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-10 pr-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-1.5">Passwort</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••"
                  required
                  minLength={6}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-10 pr-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
                />
              </div>
            </div>

            {error && (
              <p className="text-red-400 text-sm text-center">{error}</p>
            )}

            <Button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full"
            >
              {loading ? (
                <><Loader2 size={18} className="animate-spin mr-2" /> Laden...</>
              ) : isSignUp ? (
                'Registrieren'
              ) : (
                'Anmelden'
              )}
            </Button>
          </form>
        </Card>

        <button
          onClick={() => {
            setIsSignUp(!isSignUp);
            setError('');
          }}
          className="w-full text-center text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          {isSignUp ? 'Bereits einen Account? Anmelden' : 'Noch keinen Account? Registrieren'}
        </button>
      </div>
    </div>
  );
}
