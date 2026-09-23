import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Clock, Volume2, VolumeX, Bell, Hourglass, Plus, Minus } from 'lucide-react';
import { sounds } from '../utils/sound';

interface GameDebateTimerProps {
  compact?: boolean;
}

export const GameDebateTimer: React.FC<GameDebateTimerProps> = ({ compact = false }) => {
  const [totalSeconds, setTotalSeconds] = useState<number>(180); // 3 minutes default
  const [timeLeft, setTimeLeft] = useState<number>(180);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [soundAlerts, setSoundAlerts] = useState<boolean>(true);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            setIsRunning(false);
            if (soundAlerts) {
              sounds.playMidnightGong();
            }
            if (navigator.vibrate) {
              navigator.vibrate([200, 100, 200, 100, 400]);
            }
            return 0;
          }
          // Tick sound during last 5 seconds
          if (prev <= 6 && soundAlerts) {
            sounds.playHeartbeat();
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, soundAlerts]);

  const handleStart = () => {
    if (timeLeft === 0) setTimeLeft(totalSeconds);
    setIsRunning(true);
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleReset = () => {
    setIsRunning(false);
    setTimeLeft(totalSeconds);
  };

  const handleSetPreset = (seconds: number) => {
    setIsRunning(false);
    setTotalSeconds(seconds);
    setTimeLeft(seconds);
  };

  const handleAdjustSeconds = (delta: number) => {
    const next = Math.max(15, timeLeft + delta);
    setTimeLeft(next);
    if (!isRunning) {
      setTotalSeconds(next);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const percentage = Math.max(0, Math.min(100, (timeLeft / (totalSeconds || 1)) * 100));

  if (compact) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs shadow-inner">
        <Hourglass className={`w-3.5 h-3.5 text-amber-400 ${isRunning ? 'animate-pulse' : ''}`} />
        <span className={`font-mono font-bold ${timeLeft <= 30 ? 'text-red-400 animate-pulse' : 'text-amber-300'}`}>
          {formatTime(timeLeft)}
        </span>
        {isRunning ? (
          <button
            onClick={handlePause}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
            title="Pauzeren"
          >
            <Pause className="w-3 h-3" />
          </button>
        ) : (
          <button
            onClick={handleStart}
            className="p-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950"
            title="Start"
          >
            <Play className="w-3 h-3 fill-slate-950" />
          </button>
        )}
        <button
          onClick={handleReset}
          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
          title="Reset"
        >
          <RotateCcw className="w-3 h-3" />
        </button>
      </div>
    );
  }

  return (
    <div className="p-5 rounded-3xl bg-slate-900/90 border border-amber-500/30 backdrop-blur-md space-y-4 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Hourglass className={`w-4 h-4 ${isRunning ? 'animate-pulse' : ''}`} />
          </div>
          <div>
            <h4 className="text-sm font-bold font-cinzel text-white flex items-center gap-1.5">
              <span>Dorpsdebat & Pleidooi Zandloper</span>
            </h4>
            <p className="text-[10px] text-slate-400">Instelbare timer voor discussie & stemming</p>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            { label: '30s Pleidooi', secs: 30 },
            { label: '1 min', secs: 60 },
            { label: '2 min', secs: 120 },
            { label: '3 min', secs: 180 },
            { label: '5 min', secs: 300 },
          ].map((p) => (
            <button
              key={p.secs}
              onClick={() => handleSetPreset(p.secs)}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-medium transition ${
                totalSeconds === p.secs
                  ? 'bg-amber-500 text-slate-950 font-bold border border-amber-400'
                  : 'bg-slate-950 border border-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Display & Progress Bar */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span
              className={`text-4xl sm:text-5xl font-mono font-black tracking-tight ${
                timeLeft <= 10 ? 'text-red-400 animate-pulse' : 'text-amber-200'
              }`}
            >
              {formatTime(timeLeft)}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              / {formatTime(totalSeconds)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleAdjustSeconds(-15)}
              className="px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs flex items-center gap-0.5"
              title="-15 seconden"
            >
              <Minus className="w-3 h-3" /> 15s
            </button>
            <button
              onClick={() => handleAdjustSeconds(15)}
              className="px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs flex items-center gap-0.5"
              title="+15 seconden"
            >
              <Plus className="w-3 h-3" /> 15s
            </button>
          </div>
        </div>

        {/* Progress Fill Bar */}
        <div className="w-full h-2.5 rounded-full bg-slate-950 border border-slate-800 overflow-hidden">
          <div
            className={`h-full transition-all duration-1000 ease-linear rounded-full ${
              percentage < 20
                ? 'bg-red-500 shadow-lg shadow-red-500/50'
                : percentage < 50
                ? 'bg-amber-500'
                : 'bg-gradient-to-r from-amber-500 to-emerald-400'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Control buttons */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2">
          {isRunning ? (
            <button
              onClick={handlePause}
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-amber-950/40 cursor-pointer"
            >
              <Pause className="w-4 h-4 fill-slate-950" /> Pauzeer
            </button>
          ) : (
            <button
              onClick={handleStart}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-950/40 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" /> Start Timer
            </button>
          )}

          <button
            onClick={handleReset}
            className="px-3 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs flex items-center gap-1.5 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>
        </div>

        <button
          onClick={() => setSoundAlerts(!soundAlerts)}
          className={`px-3 py-2 rounded-xl border text-xs flex items-center gap-1.5 transition ${
            soundAlerts
              ? 'bg-slate-950 text-amber-300 border-amber-500/40'
              : 'bg-slate-950 text-slate-500 border-slate-800'
          }`}
          title="Geluidssignaal bij afloop aan/uit"
        >
          {soundAlerts ? <Bell className="w-3.5 h-3.5 text-amber-400" /> : <VolumeX className="w-3.5 h-3.5 text-slate-500" />}
          <span className="hidden sm:inline">{soundAlerts ? 'Gong Signaal Aan' : 'Stil'}</span>
        </button>
      </div>
    </div>
  );
};
