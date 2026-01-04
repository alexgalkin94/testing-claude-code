'use client';

import { useState, useEffect } from 'react';
import { format, differenceInSeconds, differenceInMinutes, differenceInHours } from 'date-fns';
import { Timer, Play, Square, History } from 'lucide-react';
import Card from '@/components/Card';
import Button from '@/components/Button';
import ProgressRing from '@/components/ProgressRing';
import { getCurrentFast, startFast, endFast, getFastingHistory, FastingSession } from '@/lib/storage';

const FASTING_PRESETS = [
  { hours: 16, label: '16:8', desc: 'Most popular' },
  { hours: 18, label: '18:6', desc: 'Intermediate' },
  { hours: 20, label: '20:4', desc: 'Advanced' },
  { hours: 24, label: 'OMAD', desc: 'One meal a day' },
];

export default function FastingPage() {
  const [currentFast, setCurrentFast] = useState<FastingSession | null>(null);
  const [history, setHistory] = useState<FastingSession[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [selectedPreset, setSelectedPreset] = useState(16);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    loadData();
  }, []);

  useEffect(() => {
    if (!currentFast) return;

    const interval = setInterval(() => {
      const start = new Date(currentFast.startTime);
      setElapsed(differenceInSeconds(new Date(), start));
    }, 1000);

    return () => clearInterval(interval);
  }, [currentFast]);

  const loadData = () => {
    setCurrentFast(getCurrentFast());
    setHistory(getFastingHistory());
  };

  const handleStart = () => {
    const session = startFast(selectedPreset);
    setCurrentFast(session);
    setElapsed(0);
  };

  const handleEnd = () => {
    endFast();
    loadData();
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatDuration = (start: string, end: string | null) => {
    if (!end) return '--';
    const hours = differenceInHours(new Date(end), new Date(start));
    const mins = differenceInMinutes(new Date(end), new Date(start)) % 60;
    return `${hours}h ${mins}m`;
  };

  if (!mounted) {
    return <div className="p-4 animate-pulse"><div className="h-64 bg-[#1a1a24] rounded-2xl"></div></div>;
  }

  const targetSeconds = (currentFast?.targetHours || selectedPreset) * 3600;
  const progress = Math.min((elapsed / targetSeconds) * 100, 100);
  const remaining = Math.max(targetSeconds - elapsed, 0);
  const isComplete = elapsed >= targetSeconds;

  return (
    <div className="p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Fasting Timer</h1>
        <p className="text-gray-400 text-sm">Intermittent fasting tracker</p>
      </div>

      {/* Timer Display */}
      <Card className="mb-4 flex flex-col items-center py-8" glow={!!currentFast}>
        <ProgressRing
          progress={currentFast ? progress : 0}
          size={200}
          strokeWidth={12}
          color={isComplete ? '#10b981' : '#8b5cf6'}
        >
          <div className="text-center">
            {currentFast ? (
              <>
                <p className="text-3xl font-mono font-bold">{formatTime(elapsed)}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {isComplete ? 'Goal reached!' : `${formatTime(remaining)} left`}
                </p>
              </>
            ) : (
              <>
                <Timer size={40} className="mx-auto mb-2 text-gray-600" />
                <p className="text-sm text-gray-400">Not fasting</p>
              </>
            )}
          </div>
        </ProgressRing>

        {currentFast && (
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-400">
              Started {format(new Date(currentFast.startTime), 'h:mm a')}
            </p>
            <p className="text-sm text-gray-400">
              Target: {currentFast.targetHours} hours
            </p>
          </div>
        )}
      </Card>

      {/* Controls */}
      {!currentFast ? (
        <>
          {/* Presets */}
          <Card className="mb-4">
            <h3 className="font-medium mb-3">Select Duration</h3>
            <div className="grid grid-cols-2 gap-2">
              {FASTING_PRESETS.map((preset) => (
                <button
                  key={preset.hours}
                  onClick={() => setSelectedPreset(preset.hours)}
                  className={`p-3 rounded-xl text-left transition-all ${
                    selectedPreset === preset.hours
                      ? 'bg-[#8b5cf6] text-white'
                      : 'bg-[#1a1a24] text-gray-300 hover:bg-[#2a2a3a]'
                  }`}
                >
                  <p className="font-bold text-lg">{preset.label}</p>
                  <p className={`text-xs ${selectedPreset === preset.hours ? 'text-white/70' : 'text-gray-500'}`}>
                    {preset.desc}
                  </p>
                </button>
              ))}
            </div>
          </Card>

          <Button onClick={handleStart} className="w-full" size="lg">
            <Play size={20} className="mr-2" />
            Start {selectedPreset}:{ 24 - selectedPreset} Fast
          </Button>
        </>
      ) : (
        <Button onClick={handleEnd} variant="danger" className="w-full" size="lg">
          <Square size={20} className="mr-2" />
          End Fast
        </Button>
      )}

      {/* History */}
      <Card className="mt-6">
        <h3 className="font-medium mb-3 flex items-center gap-2">
          <History size={16} className="text-gray-400" />
          Recent Fasts
        </h3>
        <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar">
          {history.slice().reverse().slice(0, 10).map((session, i) => {
            const duration = differenceInHours(
              new Date(session.endTime!),
              new Date(session.startTime)
            );
            const hitGoal = duration >= session.targetHours;
            return (
              <div key={i} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
                <div>
                  <p className="text-sm">
                    {format(new Date(session.startTime), 'MMM d, yyyy')}
                  </p>
                  <p className="text-xs text-gray-500">
                    {format(new Date(session.startTime), 'h:mm a')} - {format(new Date(session.endTime!), 'h:mm a')}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`font-medium ${hitGoal ? 'text-[#10b981]' : 'text-[#f59e0b]'}`}>
                    {formatDuration(session.startTime, session.endTime)}
                  </p>
                  <p className="text-xs text-gray-500">/ {session.targetHours}h goal</p>
                </div>
              </div>
            );
          })}
          {history.length === 0 && (
            <p className="text-gray-500 text-center py-4">No fasting history yet</p>
          )}
        </div>
      </Card>

      {/* Info */}
      <div className="mt-6 text-center text-xs text-gray-500">
        <p>Tip: The eating window is when you consume your daily calories.</p>
        <p>For 16:8, eat during an 8-hour window and fast for 16 hours.</p>
      </div>
    </div>
  );
}
