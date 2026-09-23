import React, { useEffect, useState } from 'react';
import { Moon, Volume2, BookOpen, Database, Users, Sparkles, RefreshCw, Copy, Check, Music } from 'lucide-react';
import { GameRoomState } from '../types/game';
import { sounds } from '../utils/sound';

interface NavbarProps {
  roomState: GameRoomState | null;
  isConnected: boolean;
  onOpenRules: () => void;
  onOpenSql: () => void;
  activeMode: 'online' | 'local';
  onSwitchMode: (mode: 'online' | 'local') => void;
  onLeaveRoom?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  roomState,
  isConnected,
  onOpenRules,
  onOpenSql,
  activeMode,
  onSwitchMode,
  onLeaveRoom,
}) => {
  const [copied, setCopied] = useState(false);
  const [isMusicPlaying, setIsMusicPlaying] = useState(sounds.isMusicPlaying());

  useEffect(() => {
    const unsub = sounds.subscribeMusic((playing) => {
      setIsMusicPlaying(playing);
    });
    return unsub;
  }, []);

  const toggleMusic = () => {
    sounds.toggleSuspenseMusic();
  };

  const copyCode = () => {
    if (roomState?.roomCode) {
      navigator.clipboard.writeText(roomState.roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/85 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-2">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500/20 to-red-600/20 border border-amber-500/40 flex items-center justify-center text-xl shadow-lg shadow-amber-950/30">
            🐺
          </div>
          <div>
            <h1 className="font-cinzel font-bold text-base sm:text-lg text-amber-200 tracking-wider flex items-center gap-2">
              <span>WEERWOLVEN</span>
              <span className="hidden sm:inline text-xs font-sans px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                Spelleider & Kaart
              </span>
            </h1>
            <p className="text-[10px] text-slate-400 hidden sm:block">
              Wakkerdam Companion & Realtime Multiplayer
            </p>
          </div>
        </div>

        {/* Mode & Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mode Switcher */}
          <div className="bg-slate-900 border border-slate-800 p-1 rounded-xl flex items-center text-xs">
            <button
              onClick={() => onSwitchMode('online')}
              className={`px-2.5 py-1 rounded-lg font-medium transition ${
                activeMode === 'online'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Online Kamer
            </button>
            <button
              onClick={() => onSwitchMode('local')}
              className={`px-2.5 py-1 rounded-lg font-medium transition ${
                activeMode === 'local'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Tafel Spelleider
            </button>
          </div>

          {/* Easy 1-Click Suspense Music Toggle */}
          <button
            onClick={toggleMusic}
            className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 cursor-pointer ${
              isMusicPlaying
                ? 'bg-purple-600/90 text-white border-purple-400 shadow-lg shadow-purple-950/60 animate-pulse'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
            title={isMusicPlaying ? 'Muziek uitzetten' : 'Spannende achtergrondmuziek starten'}
          >
            <Music className={`w-3.5 h-3.5 ${isMusicPlaying ? 'animate-bounce text-amber-300' : ''}`} />
            <span className="hidden sm:inline">{isMusicPlaying ? 'Muziek Aan' : 'Muziek'}</span>
          </button>

          {/* Active Room Code Pill */}
          {roomState?.roomCode && activeMode === 'online' && (
            <button
              onClick={copyCode}
              className="px-2.5 py-1 rounded-xl bg-indigo-950/60 border border-indigo-500/40 hover:border-indigo-400 text-indigo-200 text-xs font-mono font-bold flex items-center gap-1.5 transition"
              title="Klik om code te kopiëren"
            >
              <span className="text-[10px] text-indigo-400 uppercase font-sans">Kamer:</span>
              <span className="text-amber-300">{roomState.roomCode}</span>
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 opacity-60" />}
            </button>
          )}

          {/* Live Realtime (SQL Inspector) Button */}
          <button
            onClick={onOpenSql}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-emerald-500/20 hover:from-amber-500/30 hover:to-emerald-500/30 text-amber-300 border border-amber-500/50 text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-amber-950/30 transition active:scale-95 cursor-pointer"
            title="Open Live Realtime SQL & Database Inspector"
          >
            <Database className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span className="font-mono text-xs">Live Realtime</span>
          </button>

          {/* Rules / Role Guide */}
          <button
            onClick={onOpenRules}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition"
            title="Rollen & Spelregels"
          >
            <BookOpen className="w-4 h-4 text-amber-400" />
          </button>

          {/* Connection Status Dot */}
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              isConnected ? 'bg-emerald-500 shadow-lg shadow-emerald-500/50' : 'bg-red-500 animate-ping'
            }`}
            title={isConnected ? 'Verbonden met server' : 'Verbinding verbroken'}
          />
        </div>
      </div>
    </header>
  );
};
