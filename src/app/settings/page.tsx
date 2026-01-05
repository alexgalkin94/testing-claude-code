'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save, User, Target, Flame, Check, Cloud, LogOut, RefreshCw } from 'lucide-react';
import Card from '@/components/Card';
import Button from '@/components/Button';
import Input from '@/components/Input';
import { signOut, useSession } from '@/lib/auth-client';
import { useData } from '@/lib/data-store';

export default function SettingsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { data, isLoading, isSyncing, lastSyncError, updateProfile, forceSync } = useData();

  // Local form state for editing
  const [formData, setFormData] = useState<typeof data.profile | null>(null);
  const [saved, setSaved] = useState(false);

  // Initialize form data from store when it loads
  const profile = formData ?? data.profile;

  const handleSave = async () => {
    if (!formData) return;

    updateProfile(formData);
    setFormData(null); // Clear local edits
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleLogout = async () => {
    await signOut();
    router.push('/login');
    router.refresh();
  };

  const updateField = (field: keyof typeof data.profile, value: string | number) => {
    const current = formData ?? data.profile;
    setFormData({ ...current, [field]: value });
  };

  const hasChanges = formData !== null;

  if (isLoading) {
    return (
      <div className="p-4 animate-pulse">
        <div className="h-8 bg-zinc-900 rounded w-1/2 mb-4"></div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-zinc-900 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 pb-24">
      <div className="flex justify-between items-center mb-6">
        <div>
          <p className="text-zinc-500 text-sm">Deine persönlichen Ziele</p>
          <h1 className="text-xl font-semibold tracking-tight">Einstellungen</h1>
        </div>
        <div className="flex gap-2">
          {lastSyncError && (
            <Button onClick={forceSync} variant="secondary" size="sm" disabled={isSyncing}>
              <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
            </Button>
          )}
          <Button onClick={handleSave} disabled={!hasChanges || isSyncing}>
            {saved ? (
              <><Check size={16} className="mr-1" /> Gespeichert</>
            ) : isSyncing ? (
              <><Cloud size={16} className="mr-1 animate-pulse" /> Speichern...</>
            ) : (
              <><Save size={16} className="mr-1" /> Speichern</>
            )}
          </Button>
        </div>
      </div>

      {/* Sync Status */}
      {lastSyncError && (
        <div className="mb-4 p-3 bg-red-900/20 border border-red-800 rounded-lg text-sm text-red-400">
          {lastSyncError} - Änderungen werden lokal gespeichert
        </div>
      )}

      {/* Account */}
      <Card className="mb-4">
        <div className="flex items-center gap-2 mb-4">
          <User size={18} className="text-zinc-400" />
          <h2 className="font-medium">Account</h2>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-zinc-300">{session?.user?.name || 'User'}</p>
            <p className="text-xs text-zinc-500">{session?.user?.email}</p>
          </div>
          <Button onClick={handleLogout} variant="danger" size="sm">
            <LogOut size={14} className="mr-1" /> Logout
          </Button>
        </div>
      </Card>

      {/* Profile */}
      <Card className="mb-4">
        <div className="flex items-center gap-2 mb-4">
          <Target size={18} className="text-zinc-400" />
          <h2 className="font-medium">Profil</h2>
        </div>
        <div className="space-y-4">
          <Input
            label="Start-Datum"
            type="date"
            value={profile.startDate}
            onChange={(v) => updateField('startDate', v)}
          />
        </div>
      </Card>

      {/* Weight Goals */}
      <Card className="mb-4">
        <div className="flex items-center gap-2 mb-4">
          <Target size={18} className="text-emerald-500" />
          <h2 className="font-medium">Gewichtsziele</h2>
        </div>
        <div className="space-y-4">
          <Input
            label="Startgewicht"
            type="number"
            inputMode="decimal"
            value={profile.startWeight.toString()}
            onChange={(v) => updateField('startWeight', parseFloat(v) || 0)}
            suffix="kg"
            step={0.1}
          />
          <Input
            label="Aktuelles Gewicht"
            type="number"
            inputMode="decimal"
            value={profile.currentWeight.toString()}
            onChange={(v) => updateField('currentWeight', parseFloat(v) || 0)}
            suffix="kg"
            step={0.1}
          />
          <Input
            label="Zielgewicht"
            type="number"
            inputMode="decimal"
            value={profile.goalWeight.toString()}
            onChange={(v) => updateField('goalWeight', parseFloat(v) || 0)}
            suffix="kg"
            step={0.1}
          />
        </div>

        {/* Progress Preview */}
        <div className="mt-4 pt-4 border-t border-zinc-800">
          <div className="flex justify-between text-sm text-zinc-500 mb-1">
            <span>{profile.startWeight} kg</span>
            <span>{profile.goalWeight} kg</span>
          </div>
          <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full"
              style={{
                width: `${Math.max(0, Math.min(100,
                  ((profile.startWeight - profile.currentWeight) /
                   (profile.startWeight - profile.goalWeight)) * 100
                ))}%`
              }}
            />
          </div>
          <p className="text-center text-xs text-zinc-500 mt-2">
            Noch {(profile.currentWeight - profile.goalWeight).toFixed(1)} kg bis zum Ziel
          </p>
        </div>
      </Card>

      {/* Nutrition Goals */}
      <Card className="mb-4">
        <div className="flex items-center gap-2 mb-4">
          <Flame size={18} className="text-orange-500" />
          <h2 className="font-medium">Ernährungsziele</h2>
        </div>
        <div className="space-y-4">
          <Input
            label="Kalorien-Ziel"
            type="number"
            value={profile.calorieTarget.toString()}
            onChange={(v) => updateField('calorieTarget', parseInt(v) || 0)}
            suffix="kcal"
          />
          <Input
            label="Protein-Ziel"
            type="number"
            value={profile.proteinTarget.toString()}
            onChange={(v) => updateField('proteinTarget', parseInt(v) || 0)}
            suffix="g"
          />
          <Input
            label="TDEE (Täglicher Energieverbrauch)"
            type="number"
            value={profile.tdee.toString()}
            onChange={(v) => updateField('tdee', parseInt(v) || 0)}
            suffix="kcal"
          />
        </div>

        {/* Deficit Info */}
        <div className="mt-4 pt-4 border-t border-zinc-800 grid grid-cols-2 gap-4">
          <div className="text-center">
            <p className="text-2xl font-semibold text-red-400">
              -{profile.tdee - profile.calorieTarget}
            </p>
            <p className="text-xs text-zinc-500">kcal Defizit/Tag</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-semibold text-emerald-500">
              ~{((profile.tdee - profile.calorieTarget) * 7 / 7700).toFixed(2)}
            </p>
            <p className="text-xs text-zinc-500">kg Verlust/Woche</p>
          </div>
        </div>
      </Card>

      {/* Info */}
      <Card className="bg-zinc-800/50 border-zinc-700">
        <p className="text-sm text-zinc-300">
          <strong>Tipp:</strong> Ein Defizit von 500-750 kcal/Tag entspricht ca. 0.5-0.75 kg Fettverlust pro Woche - ideal für Muskelerhalt.
        </p>
      </Card>
    </div>
  );
}
