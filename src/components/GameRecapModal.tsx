import React from 'react';
import { GameRoomState, Player, GameLog } from '../types/game';
import { ALL_ROLES } from '../utils/roles';
import { X, History, Skull, Heart, Award, Shield, Users, Sparkles, CheckCircle2, AlertTriangle, Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface GameRecapModalProps {
  roomState: GameRoomState | null;
  localPlayers?: Player[];
  localLogs?: GameLog[];
  localDayNumber?: number;
  isOpen: boolean;
  onClose: () => void;
}

export const GameRecapModal: React.FC<GameRecapModalProps> = ({
  roomState,
  localPlayers,
  localLogs,
  localDayNumber,
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const players: Player[] = roomState ? Object.values(roomState.players) : localPlayers || [];
  const logs: GameLog[] = roomState?.logs || localLogs || [];
  const dayNumber = roomState?.dayNumber || localDayNumber || 1;

  const alivePlayers = players.filter((p) => p.isAlive);
  const deadPlayers = players.filter((p) => !p.isAlive);
  const werewolves = players.filter((p) => p.role === 'weerwolf' || p.role === 'witte_weerwolf');
  const aliveWolves = werewolves.filter((p) => p.isAlive);
  const aliveVillagers = alivePlayers.filter((p) => p.role !== 'weerwolf' && p.role !== 'witte_weerwolf');

  const deathCauses: Record<string, number> = {
    werewolves: deadPlayers.filter((p) => p.deathReason === 'werewolves').length,
    vote: deadPlayers.filter((p) => p.deathReason === 'vote').length,
    witch: deadPlayers.filter((p) => p.deathReason === 'witch').length,
    hunter: deadPlayers.filter((p) => p.deathReason === 'hunter').length,
    lover_heartbreak: deadPlayers.filter((p) => p.deathReason === 'lover_heartbreak').length,
  };

  const deathLabels: Record<string, { label: string; icon: string }> = {
    werewolves: { label: 'Verslonden door Weerwolven', icon: '🐺' },
    vote: { label: 'Geëxecuteerd door Dorp (Stemming)', icon: '⚖️' },
    witch: { label: 'Vergiftigd door Heks', icon: '🧪' },
    hunter: { label: 'Geraakt door Schot van Jager', icon: '🏹' },
    lover_heartbreak: { label: 'Gestorven van Liefdesverdriet', icon: '💔' },
  };

  const handleCopySummary = () => {
    const text = `📜 WAKKERDAM GAME RECAP (Dag ${dayNumber})\n` +
      `Levende Spelers: ${alivePlayers.length}/${players.length}\n` +
      `Overlevende Burgers: ${aliveVillagers.length} | Levende Wolven: ${aliveWolves.length}\n\n` +
      `GESNEUVELDE DORPELINGEN:\n` +
      deadPlayers.map((p) => `- ${p.name} (${ALL_ROLES[p.role]?.dutchName || p.role}): ${p.deathReason || 'Onbekend'}`).join('\n') +
      `\n\nLOGBOEK:\n` +
      logs.slice(-10).map((l) => `[Dag ${l.dayNumber}] ${l.message}`).join('\n');

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-3xl bg-slate-900 border border-amber-500/30 shadow-2xl shadow-black overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold font-cinzel text-white flex items-center gap-2">
                <span>Wakkerdam Kronieken & Recap</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono">
                  Dag {dayNumber}
                </span>
              </h3>
              <p className="text-xs text-slate-400">Volledig overzicht van besluiten, slachtoffers en statistieken</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopySummary}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition flex items-center gap-1.5 text-xs"
              title="Kopieer samenvatting"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span className="hidden sm:inline">{copied ? 'Gekopieerd!' : 'Kopiëren'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Scrollable */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Key Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1">
              <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-blue-400" /> Totaal Spelers
              </span>
              <div className="text-xl font-bold font-mono text-white">
                {alivePlayers.length} <span className="text-xs text-slate-500 font-normal">/ {players.length} levend</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1">
              <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-amber-400" /> Dorpelingen
              </span>
              <div className="text-xl font-bold font-mono text-amber-300">
                {aliveVillagers.length} <span className="text-xs text-slate-500 font-normal">in leven</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1">
              <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <span className="text-sm">🐺</span> Weerwolven
              </span>
              <div className="text-xl font-bold font-mono text-red-400">
                {aliveWolves.length} <span className="text-xs text-slate-500 font-normal">in leven</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1">
              <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <Skull className="w-3.5 h-3.5 text-rose-400" /> Slachtoffers
              </span>
              <div className="text-xl font-bold font-mono text-rose-300">
                {deadPlayers.length} <span className="text-xs text-slate-500 font-normal">gesneuveld</span>
              </div>
            </div>
          </div>

          {/* Doodsoorzaken Breakdown */}
          {deadPlayers.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Skull className="w-4 h-4 text-red-400" /> Doodsoorzaken Overzicht
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {Object.entries(deathCauses)
                  .filter(([_, count]) => count > 0)
                  .map(([reason, count]) => {
                    const info = deathLabels[reason] || { label: reason, icon: '⚰️' };
                    return (
                      <div
                        key={reason}
                        className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-base">{info.icon}</span>
                          <span className="text-slate-300 font-medium">{info.label}</span>
                        </div>
                        <span className="font-mono font-bold text-red-400 px-2 py-0.5 rounded-lg bg-red-950/50 border border-red-800/40">
                          {count} {count === 1 ? 'speler' : 'spelers'}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Spelerslijst met statussen */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-400" /> Spelers Status & Identiteit
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {players.map((p) => {
                const roleDef = ALL_ROLES[p.role] || ALL_ROLES.onbekend;
                return (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between p-3 rounded-2xl border transition ${
                      p.isAlive
                        ? 'bg-slate-950 border-slate-800'
                        : 'bg-red-950/10 border-red-900/30 opacity-70'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 text-white"
                        style={{ backgroundColor: p.avatarColor || '#475569' }}
                      >
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="truncate">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs font-bold truncate ${p.isAlive ? 'text-white' : 'text-slate-400 line-through'}`}>
                            {p.name}
                          </span>
                          {p.isMayor && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 font-medium flex items-center gap-0.5 border border-amber-500/40">
                              👑 Burgemeester
                            </span>
                          )}
                          {p.isLoverWith && (
                            <span className="text-[10px] text-rose-400" title="Geliefde">
                              ❤️
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-slate-400">
                          <span>{roleDef.icon}</span>
                          <span>{roleDef.dutchName}</span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      {p.isAlive ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 text-[10px] font-semibold border border-emerald-800/40">
                          <CheckCircle2 className="w-3 h-3" /> Levend
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-950/60 text-rose-400 text-[10px] font-semibold border border-rose-800/40">
                          <Skull className="w-3 h-3" /> Gesneuveld
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Spellogboek Tijdlijn */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <History className="w-4 h-4 text-blue-400" /> Tijdlijn van Wakkerdam ({logs.length} gebeurtenissen)
            </h4>
            <div className="max-h-60 overflow-y-auto space-y-2 p-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs font-mono">
              {logs.length === 0 ? (
                <div className="text-center py-6 text-slate-500">Nog geen gebeurtenissen vastgelegd.</div>
              ) : (
                logs.slice().reverse().map((log) => (
                  <div key={log.id} className="flex items-start gap-2.5 py-1 border-b border-slate-900 last:border-0">
                    <span className="text-[10px] text-amber-500/80 shrink-0 font-bold">
                      Dag {log.dayNumber}
                    </span>
                    <span className="text-slate-400 shrink-0 text-[10px]">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className={`flex-1 ${log.category === 'death' ? 'text-red-400 font-semibold' : 'text-slate-300'}`}>
                      {log.message}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
