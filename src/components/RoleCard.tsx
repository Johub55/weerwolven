import React, { useState } from 'react';
import { RoleId, Player } from '../types/game';
import { ALL_ROLES } from '../utils/roles';
import { Eye, EyeOff, Heart, Shield, Sparkles, Crown, Skull } from 'lucide-react';
import { sounds } from '../utils/sound';

interface RoleCardProps {
  player: Player;
  loverPlayer?: Player;
  hideSecret?: boolean;
  interactive?: boolean;
  compact?: boolean;
}

export const RoleCard: React.FC<RoleCardProps> = ({
  player,
  loverPlayer,
  hideSecret = false,
  interactive = true,
  compact = false,
}) => {
  const [isRevealed, setIsRevealed] = useState(!hideSecret);
  const roleDef = ALL_ROLES[player.role] || ALL_ROLES.burger;

  const toggleReveal = () => {
    if (!interactive) return;
    const next = !isRevealed;
    setIsRevealed(next);
    sounds.playCardFlip();
  };

  const handleTouchStart = () => {
    if (hideSecret && interactive) {
      setIsRevealed(true);
      sounds.playCardFlip();
    }
  };

  const handleTouchEnd = () => {
    if (hideSecret && interactive) {
      setIsRevealed(false);
    }
  };

  if (compact) {
    return (
      <div
        className={`relative flex items-center gap-3 p-3 rounded-xl border bg-gradient-to-r ${roleDef.cardBg} ${roleDef.borderColor} ${
          !player.isAlive ? 'opacity-50 grayscale' : ''
        }`}
      >
        <span className="text-2xl">{roleDef.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 font-semibold text-white truncate">
            <span>{player.name}</span>
            {player.isMayor && <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />}
            {player.isLoverWith && <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400" />}
            {player.isEnchanted && <Sparkles className="w-3.5 h-3.5 text-fuchsia-400" />}
          </div>
          <div className="text-xs text-slate-300 flex items-center gap-1">
            <span>{roleDef.dutchName}</span>
            <span>•</span>
            <span className={roleDef.team === 'werewolves' ? 'text-red-400 font-medium' : 'text-amber-400 font-medium'}>
              {roleDef.team === 'werewolves' ? 'Weerwolven' : roleDef.team === 'lovers' ? 'Geliefden' : 'Dorp'}
            </span>
          </div>
        </div>
        {!player.isAlive && (
          <span className="px-2 py-0.5 text-xs bg-red-950/80 text-red-400 border border-red-700/50 rounded-full flex items-center gap-1">
            <Skull className="w-3 h-3" /> Dood
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm mx-auto select-none">
      <div
        onClick={toggleReveal}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={`relative cursor-pointer transition-all duration-300 rounded-3xl p-6 border-2 shadow-2xl backdrop-blur-md overflow-hidden ${
          isRevealed
            ? `bg-gradient-to-b ${roleDef.cardBg} ${roleDef.borderColor} ${
                roleDef.team === 'werewolves' ? 'blood-glow' : 'moon-glow'
              }`
            : 'bg-slate-900/90 border-slate-800 hover:border-amber-500/40'
        } ${!player.isAlive ? 'border-red-900/80' : ''}`}
      >
        {/* Decorative corner borders */}
        <div className="absolute top-2 left-2 text-xs opacity-40 font-mono text-amber-300">✦</div>
        <div className="absolute top-2 right-2 text-xs opacity-40 font-mono text-amber-300">✦</div>
        <div className="absolute bottom-2 left-2 text-xs opacity-40 font-mono text-amber-300">✦</div>
        <div className="absolute bottom-2 right-2 text-xs opacity-40 font-mono text-amber-300">✦</div>

        {/* Status badges */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-1.5">
            {player.isMayor && (
              <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40 flex items-center gap-1">
                <Crown className="w-3 h-3 text-amber-400 fill-amber-400" /> Burgemeester
              </span>
            )}
            {player.isProtected && (
              <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 flex items-center gap-1">
                <Shield className="w-3 h-3 text-cyan-400" /> Beschermd
              </span>
            )}
            {player.isEnchanted && (
              <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-400/40 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-fuchsia-400" /> Betoverd
              </span>
            )}
          </div>

          {!player.isAlive ? (
            <span className="px-3 py-1 text-xs font-bold rounded-full bg-red-950/90 text-red-400 border border-red-600 flex items-center gap-1 shadow-lg shadow-red-950/50">
              <Skull className="w-3.5 h-3.5" /> GEELEMINEERD
            </span>
          ) : (
            <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Levend
            </span>
          )}
        </div>

        {isRevealed ? (
          <div className="space-y-4 text-center animate-fadeIn">
            {/* Big Role Icon */}
            <div className="relative inline-block my-2">
              <div className="w-24 h-24 mx-auto rounded-2xl bg-slate-950/60 border border-white/10 flex items-center justify-center text-6xl shadow-inner">
                {roleDef.icon}
              </div>
              <div className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-md text-[10px] uppercase font-bold tracking-wider bg-slate-900 border border-white/20 text-slate-200">
                {roleDef.team === 'werewolves' ? '🐺 Wolf' : roleDef.team === 'lovers' ? '💘 Liefde' : '🌾 Burger'}
              </div>
            </div>

            <div>
              <h3 className="text-2xl font-cinzel font-bold text-white tracking-wide">
                {roleDef.dutchName}
              </h3>
              <p className="text-xs uppercase font-medium tracking-widest text-amber-400/80 mt-0.5">
                {roleDef.name}
              </p>
            </div>

            {/* Description */}
            <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 text-left text-xs leading-relaxed text-slate-200 shadow-inner">
              <p className="font-semibold text-amber-300 mb-1 flex items-center gap-1">
                <span>Kracht & Doel:</span>
              </p>
              <p>{roleDef.description}</p>
            </div>

            {/* Lover notification */}
            {loverPlayer && (
              <div className="p-3 rounded-2xl bg-rose-950/60 border border-rose-500/40 text-left text-xs text-rose-200 flex items-center gap-3">
                <Heart className="w-6 h-6 text-rose-400 fill-rose-400 shrink-0 animate-pulse" />
                <div>
                  <p className="font-bold text-rose-300">Jouw Geliefde: {loverPlayer.name}</p>
                  <p className="text-[11px] text-rose-300/80">
                    Als {loverPlayer.name} sterft, sterf jij direct van verdriet. Jullie winnen als jullie als laatste overblijven!
                  </p>
                </div>
              </div>
            )}

            {hideSecret && (
              <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1 pt-1">
                <EyeOff className="w-3.5 h-3.5" /> Tik om weer te verbergen
              </p>
            )}
          </div>
        ) : (
          <div className="py-12 text-center space-y-4">
            <div className="w-20 h-20 mx-auto rounded-full bg-slate-800/80 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg shadow-black/40">
              <Eye className="w-8 h-8 animate-pulse" />
            </div>
            <div>
              <p className="font-cinzel text-lg font-bold text-slate-200">Geheime Rolkaart</p>
              <p className="text-xs text-amber-400/90 mt-1">
                Houd ingedrukt of klik om je kaart te bekijken
              </p>
              <p className="text-[11px] text-slate-500 mt-2">
                Zorg dat je buren niet meekijken op je scherm!
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
