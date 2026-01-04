'use client';

import { useState } from 'react';
import { Dumbbell, Moon, Battery, ChevronDown } from 'lucide-react';
import Card from './Card';

interface QuickLogProps {
  onLogWorkout: (type: string, feeling: number) => void;
  onLogWellbeing: (energy: number, hunger: number, sleep: number) => void;
  todayWorkout?: { type: string; feeling?: number };
  todayNote?: { energy: number; hunger: number; sleep?: number };
}

const WORKOUT_TYPES = [
  { id: 'push', label: 'Push', emoji: '💪' },
  { id: 'pull', label: 'Pull', emoji: '🏋️' },
  { id: 'legs', label: 'Legs', emoji: '🦵' },
  { id: 'upper', label: 'Upper', emoji: '👆' },
  { id: 'lower', label: 'Lower', emoji: '👇' },
  { id: 'full', label: 'Full Body', emoji: '🔥' },
  { id: 'rest', label: 'Rest Day', emoji: '😴' },
];

export default function QuickLog({ onLogWorkout, onLogWellbeing, todayWorkout, todayNote }: QuickLogProps) {
  const [showWorkoutPicker, setShowWorkoutPicker] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState(todayWorkout?.type || '');
  const [workoutFeeling, setWorkoutFeeling] = useState(todayWorkout?.feeling || 3);

  const [energy, setEnergy] = useState(todayNote?.energy || 3);
  const [hunger, setHunger] = useState(todayNote?.hunger || 3);
  const [sleep, setSleep] = useState(todayNote?.sleep || 7);

  const handleWorkoutSelect = (type: string) => {
    setSelectedWorkout(type);
    setShowWorkoutPicker(false);
    onLogWorkout(type, workoutFeeling);
  };

  const handleWellbeingSave = () => {
    onLogWellbeing(energy, hunger, sleep);
  };

  return (
    <div className="grid grid-cols-2 gap-3 mb-4">
      {/* Workout Log */}
      <Card>
        <div className="flex items-center gap-2 mb-2">
          <Dumbbell size={16} className="text-[#8b5cf6]" />
          <span className="text-xs font-medium text-gray-400">Workout</span>
        </div>

        <button
          onClick={() => setShowWorkoutPicker(!showWorkoutPicker)}
          className="w-full flex items-center justify-between bg-[#1a1a24] rounded-lg px-3 py-2"
        >
          <span className="text-sm">
            {selectedWorkout
              ? WORKOUT_TYPES.find(w => w.id === selectedWorkout)?.emoji + ' ' + WORKOUT_TYPES.find(w => w.id === selectedWorkout)?.label
              : 'Wählen...'}
          </span>
          <ChevronDown size={16} className={`text-gray-400 transition-transform ${showWorkoutPicker ? 'rotate-180' : ''}`} />
        </button>

        {showWorkoutPicker && (
          <div className="mt-2 space-y-1">
            {WORKOUT_TYPES.map(type => (
              <button
                key={type.id}
                onClick={() => handleWorkoutSelect(type.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  selectedWorkout === type.id
                    ? 'bg-[#8b5cf6]/20 text-[#8b5cf6]'
                    : 'bg-[#1a1a24] hover:bg-[#252532]'
                }`}
              >
                {type.emoji} {type.label}
              </button>
            ))}
          </div>
        )}

        {selectedWorkout && !showWorkoutPicker && (
          <div className="mt-2">
            <p className="text-[10px] text-gray-400 mb-1">Wie fühlst du dich?</p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  onClick={() => {
                    setWorkoutFeeling(n);
                    onLogWorkout(selectedWorkout, n);
                  }}
                  className={`flex-1 py-1 rounded text-sm ${
                    workoutFeeling === n
                      ? 'bg-[#8b5cf6] text-white'
                      : 'bg-[#1a1a24]'
                  }`}
                >
                  {n === 1 ? '😫' : n === 2 ? '😕' : n === 3 ? '😐' : n === 4 ? '😊' : '💪'}
                </button>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Wellbeing Log */}
      <Card>
        <div className="flex items-center gap-2 mb-2">
          <Battery size={16} className="text-[#10b981]" />
          <span className="text-xs font-medium text-gray-400">Befinden</span>
        </div>

        <div className="space-y-2">
          {/* Energy */}
          <div>
            <p className="text-[10px] text-gray-400">Energie</p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  onClick={() => { setEnergy(n); handleWellbeingSave(); }}
                  className={`flex-1 py-1 rounded text-xs ${
                    energy === n ? 'bg-[#10b981] text-white' : 'bg-[#1a1a24]'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Hunger */}
          <div>
            <p className="text-[10px] text-gray-400">Hunger</p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  onClick={() => { setHunger(n); handleWellbeingSave(); }}
                  className={`flex-1 py-1 rounded text-xs ${
                    hunger === n ? 'bg-[#f59e0b] text-white' : 'bg-[#1a1a24]'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Sleep */}
          <div className="flex items-center gap-2">
            <Moon size={12} className="text-[#8b5cf6]" />
            <input
              type="number"
              value={sleep}
              onChange={(e) => { setSleep(Number(e.target.value)); handleWellbeingSave(); }}
              className="w-12 bg-[#1a1a24] rounded px-2 py-1 text-xs text-center"
              min={0}
              max={12}
              step={0.5}
            />
            <span className="text-[10px] text-gray-400">Std. Schlaf</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
