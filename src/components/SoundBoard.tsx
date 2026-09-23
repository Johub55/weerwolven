import React, { useEffect, useState } from 'react';
import { sounds } from '../utils/sound';
import {
  Volume2,
  VolumeX,
  Music,
  Radio,
  Sliders,
  Sparkles,
  Flame,
  Skull,
  Play,
  Square,
  Disc,
} from 'lucide-react';

interface SoundBoardProps {
  onBroadcastSound?: (sound: 'wolf_howl' | 'gong' | 'bubble' | 'rooster' | 'bell' | 'heartbeat' | 'victory') => void;
  compact?: boolean;
}

export const SoundBoard: React.FC<SoundBoardProps> = ({ onBroadcastSound, compact = false }) => {
  const [sfxMuted, setSfxMuted] = useState(!sounds.isEnabled());
  const [isMusicPlaying, setIsMusicPlaying] = useState(sounds.isMusicPlaying());
  const [volume, setVolume] = useState(25);

  useEffect(() => {
    const unsub = sounds.subscribeMusic((playing) => {
      setIsMusicPlaying(playing);
    });
    return unsub;
  }, []);

  const toggleSfxMute = () => {
    const next = !sfxMuted;
    setSfxMuted(next);
    sounds.setSfxEnabled(!next);
  };

  const handleToggleMusic = () => {
    sounds.toggleSuspenseMusic();
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    setVolume(v);
    sounds.setMusicVolume(v / 100);
  };

  const handlePlaySfx = (
    soundType: 'wolf_howl' | 'gong' | 'bubble' | 'rooster' | 'bell' | 'heartbeat' | 'victory',
    localFn: () => void
  ) => {
    localFn();
    if (onBroadcastSound) {
      onBroadcastSound(soundType);
    }
  };

  const soundButtons = [
    {
      id: 'wolf_howl' as const,
      label: 'Wolf Gehuil',
      icon: '🐺',
      desc: 'IJzingwekkend',
      fn: () => sounds.playWolfHowl(),
      color: 'hover:border-red-500/60 bg-red-950/40 text-red-300 border-red-900/40',
    },
    {
      id: 'gong' as const,
      label: 'Kerkklok / Gong',
      icon: '🌑',
      desc: 'Zware bronsklank',
      fn: () => sounds.playMidnightGong(),
      color: 'hover:border-indigo-500/60 bg-indigo-950/40 text-indigo-300 border-indigo-900/40',
    },
    {
      id: 'heartbeat' as const,
      label: 'Hartslag Spanning',
      icon: '💓',
      desc: 'Sub-bass lub-dub',
      fn: () => sounds.playHeartbeat(),
      color: 'hover:border-rose-500/60 bg-rose-950/40 text-rose-300 border-rose-900/40',
    },
    {
      id: 'bubble' as const,
      label: 'Heksenketel',
      icon: '🧙‍♀️',
      desc: 'Pruttelend elixer',
      fn: () => sounds.playPotionBubble(),
      color: 'hover:border-emerald-500/60 bg-emerald-950/40 text-emerald-300 border-emerald-900/40',
    },
    {
      id: 'rooster' as const,
      label: 'Ochtendgloren',
      icon: '🌅',
      desc: 'Zonsopkomst fanfare',
      fn: () => sounds.playDawnAwakening(),
      color: 'hover:border-amber-500/60 bg-amber-950/40 text-amber-300 border-amber-900/40',
    },
    {
      id: 'bell' as const,
      label: 'Executie / Lynchslag',
      icon: '⚖️',
      desc: 'Hamer & Onheil',
      fn: () => sounds.playLynchStrike(),
      color: 'hover:border-orange-500/60 bg-orange-950/40 text-orange-300 border-orange-900/40',
    },
    {
      id: 'bell' as const,
      label: 'Kristallen Bol',
      icon: '🔮',
      desc: 'Zienster visioen',
      fn: () => sounds.playSeerChime(),
      color: 'hover:border-purple-500/60 bg-purple-950/40 text-purple-300 border-purple-900/40',
    },
    {
      id: 'victory' as const,
      label: 'Victorie Fanfare',
      icon: '🏆',
      desc: 'Overwinning',
      fn: () => sounds.playVictory(),
      color: 'hover:border-yellow-500/60 bg-yellow-950/40 text-yellow-300 border-yellow-900/40',
    },
  ];

  if (compact) {
    return (
      <div className="flex items-center gap-2 overflow-x-auto py-1 text-xs">
        {/* Quick Music Toggle */}
        <button
          onClick={handleToggleMusic}
          className={`px-3 py-1 rounded-xl border flex items-center gap-1.5 transition font-medium shrink-0 ${
            isMusicPlaying
              ? 'bg-purple-600 text-white border-purple-400 shadow-lg shadow-purple-950/50 animate-pulse'
              : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
          }`}
          title={isMusicPlaying ? 'Stop spannende achtergrondmuziek' : 'Start spannende achtergrondmuziek'}
        >
          <Music className={`w-3.5 h-3.5 ${isMusicPlaying ? 'animate-bounce' : ''}`} />
          <span>{isMusicPlaying ? 'Muziek Aan' : 'Muziek'}</span>
        </button>

        {soundButtons.slice(0, 4).map((btn) => (
          <button
            key={btn.label}
            onClick={() => handlePlaySfx(btn.id, btn.fn)}
            className={`px-2.5 py-1 text-xs rounded-xl border flex items-center gap-1 transition shrink-0 ${btn.color}`}
            title={btn.label}
          >
            <span>{btn.icon}</span>
            <span className="hidden sm:inline text-[11px]">{btn.label}</span>
          </button>
        ))}

        <button
          onClick={toggleSfxMute}
          className="p-1.5 rounded-xl border border-slate-800 text-slate-400 hover:text-white bg-slate-900"
          title={sfxMuted ? 'Geluidseffecten inschakelen' : 'Geluidseffecten dempen'}
        >
          {sfxMuted ? <VolumeX className="w-3.5 h-3.5 text-red-400" /> : <Volume2 className="w-3.5 h-3.5 text-amber-400" />}
        </button>
      </div>
    );
  }

  return (
    <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 backdrop-blur-md space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Volume2 className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold font-cinzel text-white">
              Sfeer Soundboard & Achtergrondmuziek
            </h4>
            <p className="text-[10px] text-slate-400">Synthesizer audio zonder externe downloads</p>
          </div>
        </div>

        {/* Music & SFX switches */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleMusic}
            className={`px-3.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition shadow cursor-pointer ${
              isMusicPlaying
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-purple-400 shadow-purple-950/50'
                : 'bg-slate-950 border-slate-700 text-slate-300 hover:text-white'
            }`}
          >
            <Music className={`w-3.5 h-3.5 ${isMusicPlaying ? 'animate-spin' : ''}`} />
            <span>{isMusicPlaying ? 'Muziek Aan (Tik om te stoppen)' : '🎵 Spannende Muziek Aan'}</span>
          </button>

          <button
            onClick={toggleSfxMute}
            className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-300 text-xs flex items-center gap-1"
          >
            {sfxMuted ? <VolumeX className="w-3.5 h-3.5 text-red-400" /> : <Volume2 className="w-3.5 h-3.5 text-amber-400" />}
            <span className="hidden sm:inline">{sfxMuted ? 'Gedempt' : 'SFX'}</span>
          </button>
        </div>
      </div>

      {/* Music Volume Slider (if active) */}
      {isMusicPlaying && (
        <div className="p-3 rounded-2xl bg-purple-950/40 border border-purple-800/40 flex items-center justify-between gap-4 animate-fadeIn">
          <div className="flex items-center gap-2 text-xs text-purple-200">
            <Disc className="w-4 h-4 text-purple-400 animate-spin" />
            <span>Duistere Wakkerdam Ambient Drone & Melodie</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-purple-300">Volume:</span>
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={handleVolumeChange}
              className="w-24 h-1.5 bg-slate-800 rounded-lg accent-purple-400 cursor-pointer"
            />
          </div>
        </div>
      )}

      {/* Sound Effects Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {soundButtons.map((btn, i) => (
          <button
            key={i}
            onClick={() => handlePlaySfx(btn.id, btn.fn)}
            className={`p-3 rounded-2xl border text-xs text-left transition active:scale-95 flex flex-col justify-between gap-1 shadow-sm ${btn.color}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xl">{btn.icon}</span>
              <span className="text-[10px] opacity-60 font-mono">SFX</span>
            </div>
            <div>
              <p className="font-bold text-white text-xs leading-tight">{btn.label}</p>
              <p className="text-[10px] opacity-75">{btn.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
