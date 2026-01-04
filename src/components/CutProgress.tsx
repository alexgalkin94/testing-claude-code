'use client';

import { TrendingDown, Target, Calendar, Flame } from 'lucide-react';
import Card from './Card';

interface CutProgressProps {
  startWeight: number;
  currentWeight: number;
  goalWeight: number;
  startDate: string;
  weeklyLossRate: number;
  daysIn: number;
}

export default function CutProgress({
  startWeight,
  currentWeight,
  goalWeight,
  startDate,
  weeklyLossRate,
  daysIn,
}: CutProgressProps) {
  const totalToLose = startWeight - goalWeight;
  const lost = startWeight - currentWeight;
  const remaining = currentWeight - goalWeight;
  const progress = totalToLose > 0 ? (lost / totalToLose) * 100 : 0;

  const estimatedWeeksLeft = weeklyLossRate > 0 ? remaining / weeklyLossRate : 0;
  const estimatedEndDate = new Date();
  estimatedEndDate.setDate(estimatedEndDate.getDate() + estimatedWeeksLeft * 7);

  // Determine if on track (0.5-1% body weight per week is healthy)
  const weeklyPercent = (weeklyLossRate / currentWeight) * 100;
  const isOnTrack = weeklyPercent >= 0.4 && weeklyPercent <= 1.2;
  const isTooFast = weeklyPercent > 1.2;
  const isTooSlow = weeklyPercent < 0.4 && weeklyPercent > 0;

  return (
    <Card className="mb-4" glow>
      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>{startWeight} kg</span>
          <span className="text-[#8b5cf6] font-medium">{currentWeight} kg</span>
          <span>{goalWeight} kg</span>
        </div>
        <div className="h-3 bg-[#1a1a24] rounded-full overflow-hidden relative">
          <div
            className="h-full bg-gradient-to-r from-[#8b5cf6] to-[#10b981] transition-all duration-500"
            style={{ width: `${Math.min(100, progress)}%` }}
          />
          {/* Goal marker */}
          <div className="absolute right-0 top-0 h-full w-0.5 bg-[#10b981]" />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-2">
        <div className="text-center">
          <div className="flex items-center justify-center mb-1">
            <TrendingDown size={14} className="text-[#10b981]" />
          </div>
          <p className="text-lg font-bold text-[#10b981]">-{lost.toFixed(1)}</p>
          <p className="text-[10px] text-gray-400">kg verloren</p>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center mb-1">
            <Target size={14} className="text-[#8b5cf6]" />
          </div>
          <p className="text-lg font-bold">{remaining.toFixed(1)}</p>
          <p className="text-[10px] text-gray-400">kg übrig</p>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center mb-1">
            <Calendar size={14} className="text-[#f59e0b]" />
          </div>
          <p className="text-lg font-bold">{daysIn}</p>
          <p className="text-[10px] text-gray-400">Tage</p>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center mb-1">
            <Flame size={14} className={isOnTrack ? 'text-[#10b981]' : isTooFast ? 'text-[#ef4444]' : 'text-[#f59e0b]'} />
          </div>
          <p className={`text-lg font-bold ${isOnTrack ? 'text-[#10b981]' : isTooFast ? 'text-[#ef4444]' : 'text-[#f59e0b]'}`}>
            {weeklyLossRate.toFixed(2)}
          </p>
          <p className="text-[10px] text-gray-400">kg/Woche</p>
        </div>
      </div>

      {/* Status Message */}
      {daysIn > 7 && (
        <div className={`mt-3 pt-3 border-t border-white/10 text-center text-xs ${
          isOnTrack ? 'text-[#10b981]' : isTooFast ? 'text-[#ef4444]' : 'text-[#f59e0b]'
        }`}>
          {isOnTrack && '✓ Perfektes Tempo! Weiter so.'}
          {isTooFast && '⚠ Zu schnell - evtl. Muskelverlust. Kalorien erhöhen?'}
          {isTooSlow && '💪 Etwas langsam - Geduld oder Deficit erhöhen?'}
          {weeklyLossRate <= 0 && '📊 Noch nicht genug Daten für Trend'}
        </div>
      )}

      {/* Estimated End */}
      {estimatedWeeksLeft > 0 && estimatedWeeksLeft < 52 && (
        <div className="mt-2 text-center text-xs text-gray-400">
          Geschätzt fertig: {estimatedEndDate.toLocaleDateString('de-DE', { month: 'short', day: 'numeric' })}
          {' '}(~{Math.ceil(estimatedWeeksLeft)} Wochen)
        </div>
      )}
    </Card>
  );
}
