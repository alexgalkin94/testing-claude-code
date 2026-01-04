'use client';

import { useState, useEffect } from 'react';
import { Save, User, Target, Flame, Calendar, Cloud, Check } from 'lucide-react';
import Card from '@/components/Card';
import Button from '@/components/Button';
import Input from '@/components/Input';

interface Profile {
  name: string;
  startWeight: number;
  currentWeight: number;
  goalWeight: number;
  startDate: string;
  calorieTarget: number;
  proteinTarget: number;
  tdee: number;
}

const PROFILE_KEY = 'cutboard_profile';

const DEFAULT_PROFILE: Profile = {
  name: 'Alex',
  startWeight: 90,
  currentWeight: 90,
  goalWeight: 82,
  startDate: '2024-12-01',
  calorieTarget: 1700,
  proteinTarget: 157,
  tdee: 2125,
};

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    loadProfile();
  }, []);

  const loadProfile = async () => {
    // Load from localStorage
    const saved = localStorage.getItem(PROFILE_KEY);
    if (saved) {
      setProfile(JSON.parse(saved));
    }

    // Try to load from server
    try {
      const response = await fetch('/api/sync');
      if (response.ok) {
        const data = await response.json();
        if (data?.profile) {
          setProfile(data.profile);
          localStorage.setItem(PROFILE_KEY, JSON.stringify(data.profile));
        }
      }
    } catch (e) {
      console.log('Server sync unavailable');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);

    // Save locally
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));

    // Sync to server
    try {
      const existingData = localStorage.getItem('cutboard_data');
      const data = existingData ? JSON.parse(existingData) : {};
      data.profile = profile;

      await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    } catch (e) {
      console.log('Server sync failed');
    }

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const updateField = (field: keyof Profile, value: string | number) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  if (!mounted) {
    return (
      <div className="p-4 animate-pulse">
        <div className="h-8 bg-[#1a1a24] rounded w-1/2 mb-4"></div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-[#1a1a24] rounded-2xl"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 pb-24">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Einstellungen</h1>
          <p className="text-gray-400 text-sm">Deine persönlichen Ziele</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saved ? (
            <><Check size={16} className="mr-1" /> Gespeichert</>
          ) : saving ? (
            <><Cloud size={16} className="mr-1 animate-pulse" /> Speichern...</>
          ) : (
            <><Save size={16} className="mr-1" /> Speichern</>
          )}
        </Button>
      </div>

      {/* Profile */}
      <Card className="mb-4">
        <div className="flex items-center gap-2 mb-4">
          <User size={18} className="text-[#8b5cf6]" />
          <h2 className="font-semibold">Profil</h2>
        </div>
        <div className="space-y-4">
          <Input
            label="Name"
            value={profile.name}
            onChange={(v) => updateField('name', v)}
            placeholder="Dein Name"
          />
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
          <Target size={18} className="text-[#10b981]" />
          <h2 className="font-semibold">Gewichtsziele</h2>
        </div>
        <div className="space-y-4">
          <Input
            label="Startgewicht"
            type="number"
            value={profile.startWeight.toString()}
            onChange={(v) => updateField('startWeight', parseFloat(v) || 0)}
            suffix="kg"
            step={0.1}
          />
          <Input
            label="Aktuelles Gewicht"
            type="number"
            value={profile.currentWeight.toString()}
            onChange={(v) => updateField('currentWeight', parseFloat(v) || 0)}
            suffix="kg"
            step={0.1}
          />
          <Input
            label="Zielgewicht"
            type="number"
            value={profile.goalWeight.toString()}
            onChange={(v) => updateField('goalWeight', parseFloat(v) || 0)}
            suffix="kg"
            step={0.1}
          />
        </div>

        {/* Progress Preview */}
        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="flex justify-between text-sm text-gray-400 mb-1">
            <span>{profile.startWeight} kg</span>
            <span>{profile.goalWeight} kg</span>
          </div>
          <div className="h-2 bg-[#1a1a24] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#8b5cf6] to-[#10b981]"
              style={{
                width: `${Math.max(0, Math.min(100,
                  ((profile.startWeight - profile.currentWeight) /
                   (profile.startWeight - profile.goalWeight)) * 100
                ))}%`
              }}
            />
          </div>
          <p className="text-center text-xs text-gray-400 mt-2">
            Noch {(profile.currentWeight - profile.goalWeight).toFixed(1)} kg bis zum Ziel
          </p>
        </div>
      </Card>

      {/* Nutrition Goals */}
      <Card className="mb-4">
        <div className="flex items-center gap-2 mb-4">
          <Flame size={18} className="text-[#f59e0b]" />
          <h2 className="font-semibold">Ernährungsziele</h2>
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
        <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-2 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-[#ef4444]">
              -{profile.tdee - profile.calorieTarget}
            </p>
            <p className="text-xs text-gray-400">kcal Defizit/Tag</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-[#10b981]">
              ~{((profile.tdee - profile.calorieTarget) * 7 / 7700).toFixed(2)}
            </p>
            <p className="text-xs text-gray-400">kg Verlust/Woche</p>
          </div>
        </div>
      </Card>

      {/* Info */}
      <Card className="bg-[#8b5cf6]/10 border-[#8b5cf6]/20">
        <p className="text-sm text-gray-300">
          <strong>Tipp:</strong> Ein Defizit von 500-750 kcal/Tag entspricht ca. 0.5-0.75 kg Fettverlust pro Woche - ideal für Muskelerhalt.
        </p>
      </Card>
    </div>
  );
}
