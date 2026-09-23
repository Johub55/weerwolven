import React, { useState } from 'react';
import { GameRoomState, Player, RoleId, Phase, WsClientAction } from '../types/game';
import { ALL_ROLES } from '../utils/roles';
import { SoundBoard } from './SoundBoard';
import {
  Moon,
  Sun,
  Play,
  RotateCcw,
  SkipForward,
  Skull,
  Heart,
  Shield,
  Crown,
  Sparkles,
  Eye,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Volume2,
  Users,
  Flame,
  UserCheck,
  RefreshCw,
  Shuffle,
  ChevronRight,
} from 'lucide-react';
import { sounds } from '../utils/sound';

interface SpelleiderDashboardProps {
  roomState: GameRoomState;
  myPlayerId: string;
  onSendAction: (action: WsClientAction) => void;
}

export const SpelleiderDashboard: React.FC<SpelleiderDashboardProps> = ({
  roomState,
  myPlayerId,
  onSendAction,
}) => {
  const [selectedPlayerForEdit, setSelectedPlayerForEdit] = useState<Player | null>(null);

  const currentPhase = roomState.phase;
  const isNight = currentPhase.startsWith('night_');
  const alivePlayers = roomState.players.filter((p) => p.isAlive);
  const deadPlayers = roomState.players.filter((p) => !p.isAlive);

  // Script text based on current phase
  const getPhaseScript = (): { title: string; lines: string[]; icon: string } => {
    switch (currentPhase) {
      case 'night_cupido':
        return {
          title: 'Cupido Brengt Eeuwige Liefde',
          icon: '💘',
          lines: [
            'Iedereen sluit de ogen... De nacht valt over Wakkerdam.',
            'Cupido, ontwaak! Wijs twee dorpsbewoners aan die elkaars geliefden worden.',
            'Cupido, sluit je ogen en ga weer slapen.',
            '(Spelleider tikt zacht op schouder van geliefden): Geliefden, open jullie ogen en kijk elkaar verliefd aan!',
            'Geliefden, sluit weer jullie ogen.',
          ],
        };
      case 'night_thief':
        return {
          title: 'De Dief Kiest Een Identiteit',
          icon: '🗡️',
          lines: [
            'Dief, word wakker! Bekijk de twee overgebleven kaarten op tafel.',
            'Maak je keuze om van rol te wisselen of burger te blijven.',
            'Dief, sluit je ogen.',
          ],
        };
      case 'night_guard':
        return {
          title: 'De Beschermer / Lijfwacht Waakt',
          icon: '🛡️',
          lines: [
            'Beschermer, ontwaak! Wijs één speler aan die je vannacht wilt verdedigen tegen wolven.',
            'Beschermer, sluit je ogen en ga weer slapen.',
          ],
        };
      case 'night_seer':
        return {
          title: 'De Zienster Kijkt In Haar Bol',
          icon: '🔮',
          lines: [
            'Zienster, word wakker! Wijs één speler aan wiens geheime rol je wilt bekijken.',
            '(Toon in stilte de kaart van de gekozen speler aan de zienster).',
            'Zienster, sluit je ogen en ga weer slapen.',
          ],
        };
      case 'night_werewolves':
        return {
          title: 'De Weerwolven Gaan Op Jacht',
          icon: '🐺',
          lines: [
            'Weerwolven, open jullie ogen en herken elkaar.',
            'Kijk elkaar aan en wijs in stilte één dorpsslachtoffer aan.',
            'Weerwolven, sluit jullie ogen en ga weer slapen.',
          ],
        };
      case 'night_witch':
        return {
          title: 'De Heks Met Haar Toverdranken',
          icon: '🧙‍♀️',
          lines: [
            'Heks, ontwaak! Ik toon je het slachtoffer van de weerwolven...',
            'Wil je je levensdrank gebruiken om deze persoon te redden? (Knip met duim omhoog/omlaag)',
            'Wil je je vergifdrank gebruiken om een andere speler te doden? (Wijs aan of schud nee)',
            'Heks, sluit je ogen en slaap weer in.',
          ],
        };
      case 'night_flute':
        return {
          title: 'De Fluitspeler Hypnotiseert',
          icon: '🪈',
          lines: [
            'Fluitspeler, ontwaak! Wijs twee spelers aan om te betoveren met je melodie.',
            'Fluitspeler, sluit je ogen.',
            '(Spelleider tikt betoverden aan): Betoverde spelers, open jullie ogen en herken elkaar!',
            'Betoverden, sluit weer je ogen.',
          ],
        };
      case 'night_end_summary':
        return {
          title: 'De Nacht Eindigt • Ochtendgloren',
          icon: '🌅',
          lines: [
            'De zon komt op boven het vredige dorpje Wakkerdam...',
            'Iedereen mag zijn ogen openen!',
            'Helaas is niet iedereen deze nacht ongedeerd doorgekomen...',
          ],
        };
      case 'day_discussion':
        return {
          title: 'Dorpsberaad & Discussie',
          icon: '☀️',
          lines: [
            'Het dorp overlegt over de gebeurtenissen van vannacht.',
            'Wie gedraagt zich verdacht? Wie verdedigt wie?',
            'Na het beraad zal er gestemd worden over een executie!',
          ],
        };
      case 'day_voting':
        return {
          title: 'Dorpsstemming / Lynch',
          icon: '⚖️',
          lines: [
            'De dorpsstemming is geopend! Iedereen telt af: 3, 2, 1... Wijs aan!',
            'De speler met de meeste stemmen wordt verbannen uit het dorp.',
            '(Bij staking van stemmen telt het oordeel van de Burgemeester dubbel).',
          ],
        };
      case 'day_hunter_revenge':
        return {
          title: 'Jagers Laatste Schot!',
          icon: '🏹',
          lines: [
            'De Jager is gestorven, maar lost met zijn stervende adem nog één dodelijk schot!',
            'Jager, wijs direct jouw doelwit aan.',
          ],
        };
      default:
        return {
          title: 'Spel Beheer',
          icon: '👑',
          lines: ['Beheer het spelverloop en help spelers met het nakomen van de regels.'],
        };
    }
  };

  const script = getPhaseScript();

  // Next Phase click
  const handleAdvance = () => {
    onSendAction({ type: 'NEXT_PHASE', payload: {} });
  };

  // Jump to specific phase
  const handleJumpPhase = (targetPhase: Phase) => {
    onSendAction({ type: 'NEXT_PHASE', payload: { targetPhase } });
  };

  // Direct start next night button
  const handleStartNextNight = () => {
    onSendAction({ type: 'START_NEXT_NIGHT', payload: {} });
  };

  // Restart game keeping all connected players
  const handleRestartSamePlayers = () => {
    if (confirm('Wil je een nieuwe ronde starten met alle spelers in deze kamer? Iedereen krijgt een nieuwe geheime rol!')) {
      onSendAction({ type: 'RESTART_SAME_PLAYERS', payload: {} });
    }
  };

  // Reset to Lobby
  const handleReset = () => {
    if (confirm('Weet je zeker dat je het spel wilt resetten naar de lobby?')) {
      onSendAction({ type: 'RESET_GAME', payload: {} });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 animate-fadeIn">
      {/* Top Banner: Master Controller */}
      <div
        className={`p-6 rounded-3xl border-2 shadow-2xl backdrop-blur-md flex flex-col lg:flex-row items-center justify-between gap-6 ${
          isNight
            ? 'bg-slate-950/95 border-indigo-500/50 text-indigo-100 shadow-indigo-950/50'
            : 'bg-amber-950/60 border-amber-500/60 text-amber-100 shadow-amber-950/50'
        }`}
      >
        <div className="flex items-center gap-4 text-center lg:text-left">
          <div className="w-16 h-16 rounded-2xl bg-black/40 border border-white/20 flex items-center justify-center text-3xl shadow-inner shrink-0">
            {script.icon}
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-center lg:justify-start gap-2">
              <span className="text-xs uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full bg-white/10 border border-white/20">
                {isNight ? `Nacht ${roomState.dayNumber}` : `Dag ${roomState.dayNumber}`} • Kamer: {roomState.roomCode}
              </span>
              <span className="text-xs font-mono text-amber-300">
                {alivePlayers.length} Levend / {deadPlayers.length} Dood
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-cinzel font-black tracking-wide text-white">
              {script.title}
            </h2>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          <button
            onClick={handleAdvance}
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs sm:text-sm shadow-xl shadow-amber-950/60 flex items-center gap-2 transition active:scale-95 cursor-pointer"
          >
            <span>Volgende Stap</span>
            <SkipForward className="w-4 h-4 fill-slate-950" />
          </button>

          <button
            onClick={handleStartNextNight}
            className="px-4 py-2.5 rounded-2xl bg-indigo-900 hover:bg-indigo-800 border border-indigo-500/50 text-indigo-100 text-xs font-bold flex items-center gap-1.5 transition shadow"
            title="Start direct de volgende nacht"
          >
            <Moon className="w-3.5 h-3.5" />
            <span>Nieuwe Nacht</span>
          </button>

          <button
            onClick={handleRestartSamePlayers}
            className="px-3.5 py-2.5 rounded-2xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-600/50 text-emerald-200 text-xs font-bold flex items-center gap-1.5 transition shadow"
            title="Deel nieuwe rollen uit aan dezelfde spelers"
          >
            <Shuffle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Nieuwe Ronde</span>
          </button>

          <button
            onClick={handleReset}
            className="px-3.5 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition"
            title="Reset naar lobby"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Lobby</span>
          </button>
        </div>
      </div>

      {/* Quick Phase Shortcut Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs px-1">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
          Snelle Fasen:
        </span>
        <button
          onClick={() => handleJumpPhase('night_seer')}
          className={`px-3 py-1.5 rounded-xl border text-xs font-medium shrink-0 transition flex items-center gap-1 ${
            currentPhase === 'night_seer' ? 'bg-indigo-600 text-white border-indigo-400 font-bold' : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-600'
          }`}
        >
          🔮 Zienster
        </button>
        <button
          onClick={() => handleJumpPhase('night_werewolves')}
          className={`px-3 py-1.5 rounded-xl border text-xs font-medium shrink-0 transition flex items-center gap-1 ${
            currentPhase === 'night_werewolves' ? 'bg-red-600 text-white border-red-400 font-bold' : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-600'
          }`}
        >
          🐺 Weerwolven
        </button>
        <button
          onClick={() => handleJumpPhase('night_witch')}
          className={`px-3 py-1.5 rounded-xl border text-xs font-medium shrink-0 transition flex items-center gap-1 ${
            currentPhase === 'night_witch' ? 'bg-emerald-600 text-white border-emerald-400 font-bold' : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-600'
          }`}
        >
          🧙‍♀️ Heks
        </button>
        <button
          onClick={() => handleJumpPhase('night_guard')}
          className={`px-3 py-1.5 rounded-xl border text-xs font-medium shrink-0 transition flex items-center gap-1 ${
            currentPhase === 'night_guard' ? 'bg-cyan-600 text-white border-cyan-400 font-bold' : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-600'
          }`}
        >
          🛡️ Beschermer
        </button>
        <button
          onClick={() => handleJumpPhase('night_end_summary')}
          className={`px-3 py-1.5 rounded-xl border text-xs font-medium shrink-0 transition flex items-center gap-1 ${
            currentPhase === 'night_end_summary' ? 'bg-amber-600 text-white border-amber-400 font-bold' : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-600'
          }`}
        >
          🌅 Ochtend
        </button>
        <button
          onClick={() => handleJumpPhase('day_discussion')}
          className={`px-3 py-1.5 rounded-xl border text-xs font-medium shrink-0 transition flex items-center gap-1 ${
            currentPhase === 'day_discussion' ? 'bg-amber-500 text-slate-950 font-bold border-amber-400' : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-600'
          }`}
        >
          ☀️ Dorpsberaad
        </button>
        <button
          onClick={() => handleJumpPhase('day_voting')}
          className={`px-3 py-1.5 rounded-xl border text-xs font-medium shrink-0 transition flex items-center gap-1 ${
            currentPhase === 'day_voting' ? 'bg-amber-500 text-slate-950 font-bold border-amber-400' : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-600'
          }`}
        >
          ⚖️ Stemming
        </button>
      </div>

      {/* Spoken Narration Script Box */}
      <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
            <Volume2 className="w-4 h-4" />
            <span>Spelleider Voorleestekst (Spreek dit luid uit):</span>
          </h3>
          <span className="text-xs text-slate-400">Fase: {roomState.phase}</span>
        </div>
        <div className="space-y-2 bg-slate-950/80 p-4 rounded-2xl border border-slate-800 font-serif">
          {script.lines.map((line, idx) => (
            <p key={idx} className="text-sm sm:text-base text-slate-200 leading-relaxed italic flex items-start gap-2">
              <span className="text-amber-400 font-sans font-bold not-italic text-xs mt-1">{idx + 1}.</span>
              <span>"{line}"</span>
            </p>
          ))}
        </div>
      </div>

      {/* Main Grid: Player Matrix & Live State Inspections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 2 Cols: Living & Dead Players Matrix with Role Changing Overrides */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-cinzel font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-400" />
                <span>Spelersoverzicht & Geheime Rollen ({roomState.players.length})</span>
              </h3>
              <span className="text-xs text-slate-400">Jij ziet als Spelleider alles!</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {roomState.players.map((p) => {
                const roleDef = ALL_ROLES[p.role] || ALL_ROLES.burger;
                const lover = p.isLoverWith ? roomState.players.find((pl) => pl.id === p.isLoverWith) : null;
                const isWolf = p.role === 'weerwolf';

                return (
                  <div
                    key={p.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      p.isAlive
                        ? `bg-slate-950/80 border-slate-800 ${isWolf ? 'hover:border-red-500/50' : 'hover:border-amber-500/50'}`
                        : 'bg-red-950/20 border-red-900/40 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{roleDef.icon}</span>
                        <div>
                          <div className="font-bold text-sm text-white flex items-center gap-1.5">
                            <span>{p.name}</span>
                            {p.isMayor && <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />}
                            {p.isLoverWith && <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400" />}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <select
                              value={p.role}
                              onChange={(e) =>
                                onSendAction({
                                  type: 'CHANGE_PLAYER_ROLE',
                                  payload: { playerId: p.id, newRole: e.target.value as RoleId },
                                })
                              }
                              className="text-[11px] bg-slate-900 border border-slate-700 text-amber-300 font-semibold rounded px-1.5 py-0.5"
                            >
                              {Object.values(ALL_ROLES)
                                .filter((r) => r.id !== 'onbekend')
                                .map((r) => (
                                  <option key={r.id} value={r.id}>
                                    {r.icon} {r.dutchName}
                                  </option>
                                ))}
                            </select>
                          </div>
                          {lover && (
                            <p className="text-[10px] text-rose-300 flex items-center gap-1 mt-0.5">
                              💘 Geliefde van {lover.name}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Status Badges */}
                      <div className="flex flex-col items-end gap-1">
                        {!p.isAlive ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-950 text-red-400 border border-red-800">
                            DOOD
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                            LEVEND
                          </span>
                        )}
                        {p.isProtected && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] bg-cyan-950 text-cyan-300 border border-cyan-800">
                            🛡️ Beschermd
                          </span>
                        )}
                        {p.isEnchanted && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] bg-fuchsia-950 text-fuchsia-300 border border-fuchsia-800">
                            ✨ Betoverd
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Spelleider Quick Action Buttons */}
                    <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs gap-1">
                      {p.isAlive ? (
                        <button
                          onClick={() => {
                            onSendAction({ type: 'KILL_PLAYER', payload: { playerId: p.id, reason: 'spelleider' } });
                            sounds.playMidnightGong();
                          }}
                          className="px-2.5 py-1 rounded-lg bg-red-950/60 hover:bg-red-900 border border-red-800 text-red-300 text-[11px] font-medium flex items-center gap-1"
                        >
                          <Skull className="w-3 h-3" /> Elimineer
                        </button>
                      ) : (
                        <button
                          onClick={() => onSendAction({ type: 'REVIVE_PLAYER', payload: { playerId: p.id } })}
                          className="px-2.5 py-1 rounded-lg bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 text-[11px] font-medium"
                        >
                          ✨ Wek tot leven
                        </button>
                      )}

                      {!p.isMayor && p.isAlive && (
                        <button
                          onClick={() => onSendAction({ type: 'SET_MAYOR', payload: { targetId: p.id } })}
                          className="px-2 py-1 rounded-lg bg-amber-950/40 hover:bg-amber-900 border border-amber-800/60 text-amber-300 text-[11px]"
                        >
                          👑 Maak Burgemeester
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Soundboard for atmosphere */}
          <SoundBoard />
        </div>

        {/* Right 1 Col: Night Decisions, Voting Tally & Logs */}
        <div className="space-y-6">
          {/* Night Decisions Panel */}
          <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4">
            <h3 className="text-base font-cinzel font-bold text-white flex items-center gap-2">
              <Moon className="w-4 h-4 text-indigo-400" />
              <span>Nachtbesluiten (Live)</span>
            </h3>

            <div className="space-y-2.5 text-xs">
              {/* Werewolves target */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="font-bold text-red-400 flex items-center gap-1 mb-1">
                  🐺 Weerwolven Aanval:
                </span>
                {roomState.nightDecisions.werewolfTarget ? (
                  <p className="text-slate-200">
                    Doelwit:{' '}
                    <strong className="text-red-300">
                      {roomState.players.find((p) => p.id === roomState.nightDecisions.werewolfTarget)?.name}
                    </strong>
                  </p>
                ) : (
                  <p className="text-slate-500 italic">Nog geen unaniem doelwit gekozen.</p>
                )}
              </div>

              {/* Seer check */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="font-bold text-indigo-400 flex items-center gap-1 mb-1">
                  🔮 Zienster Inzicht:
                </span>
                {roomState.nightDecisions.seerCheckedTarget ? (
                  <p className="text-slate-200">
                    Bekeken:{' '}
                    <strong className="text-indigo-300">
                      {roomState.players.find((p) => p.id === roomState.nightDecisions.seerCheckedTarget)?.name}
                    </strong>{' '}
                    (Rol:{' '}
                    {ALL_ROLES[roomState.nightDecisions.seerRevealedRole || 'burger']?.dutchName})
                  </p>
                ) : (
                  <p className="text-slate-500 italic">Nog niemand bekeken.</p>
                )}
              </div>

              {/* Guard target */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="font-bold text-cyan-400 flex items-center gap-1 mb-1">
                  🛡️ Beschermer Schild:
                </span>
                {roomState.nightDecisions.guardTarget ? (
                  <p className="text-slate-200">
                    Beschermd:{' '}
                    <strong className="text-cyan-300">
                      {roomState.players.find((p) => p.id === roomState.nightDecisions.guardTarget)?.name}
                    </strong>
                  </p>
                ) : (
                  <p className="text-slate-500 italic">Niemand beschermd.</p>
                )}
              </div>

              {/* Witch actions */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="font-bold text-emerald-400 flex items-center gap-1 mb-1">
                  🧙‍♀️ Heksen Brouwsels:
                </span>
                <p className="text-slate-200">
                  Levensdrank:{' '}
                  {roomState.nightDecisions.witchHealTarget ? (
                    <strong className="text-emerald-300">Gebruikt (gered)</strong>
                  ) : (
                    'Niet gebruikt'
                  )}
                </p>
                <p className="text-slate-200 mt-0.5">
                  Vergifdrank:{' '}
                  {roomState.nightDecisions.witchPoisonTarget ? (
                    <strong className="text-red-400">
                      Gebruikt op{' '}
                      {roomState.players.find((p) => p.id === roomState.nightDecisions.witchPoisonTarget)?.name}
                    </strong>
                  ) : (
                    'Niet gebruikt'
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Spellogboek / Activity Log */}
          <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-3">
            <h3 className="text-base font-cinzel font-bold text-white">Spellogboek</h3>
            <div className="max-h-60 overflow-y-auto space-y-2 pr-1 text-xs">
              {roomState.logs.map((log) => (
                <div key={log.id} className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
                  <div className="flex items-center justify-between text-[10px] text-slate-500 mb-0.5">
                    <span>{log.phase}</span>
                    <span>{log.timestamp}</span>
                  </div>
                  <p className="text-slate-200 font-medium">{log.message}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
