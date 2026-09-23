import React, { useState } from 'react';
import { GameRoomState, Player, RoleId, Phase, WsClientAction } from '../types/game';
import { RoleCard } from './RoleCard';
import { ALL_ROLES } from '../utils/roles';
import { Moon, Sun, Vote, Eye, Skull, Shield, Heart, Send, Sparkles, MessageSquare, Flame, CheckCircle, Crosshair } from 'lucide-react';
import { sounds } from '../utils/sound';

interface PlayerMobileViewProps {
  roomState: GameRoomState;
  myPlayerId: string;
  seerPeekResult: { targetId: string; targetName: string; role: RoleId } | null;
  onSendAction: (action: WsClientAction) => void;
}

export const PlayerMobileView: React.FC<PlayerMobileViewProps> = ({
  roomState,
  myPlayerId,
  seerPeekResult,
  onSendAction,
}) => {
  const [wolfChatText, setWolfChatText] = useState('');
  const [activeTab, setActiveTab] = useState<'card' | 'action' | 'players' | 'logs'>('action');

  // Find own player record
  const myPlayer = roomState.players.find((p) => p.id === myPlayerId) || {
    id: myPlayerId,
    name: 'Jij',
    role: 'burger' as RoleId,
    isAlive: true,
    isMayor: false,
    avatarColor: '#f59e0b',
  };

  const loverPlayer = myPlayer.isLoverWith
    ? roomState.players.find((p) => p.id === myPlayer.isLoverWith)
    : undefined;

  const alivePlayers = roomState.players.filter((p) => p.isAlive);
  const otherAlivePlayers = alivePlayers.filter((p) => p.id !== myPlayerId);
  const currentPhase = roomState.phase;
  const isNight = currentPhase.startsWith('night_');
  const roleDef = ALL_ROLES[myPlayer.role] || ALL_ROLES.burger;

  // Werewolf chat submission
  const handleSendWolfChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wolfChatText.trim()) return;
    onSendAction({
      type: 'WOLF_MESSAGE',
      payload: { text: wolfChatText.trim() },
    });
    setWolfChatText('');
  };

  // State calculations
  const myVote = roomState.dayVotes[myPlayerId];
  const myWolfVote = roomState.nightDecisions.werewolfVotes?.[myPlayerId];

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4 pb-20 animate-fadeIn">
      {/* Top Banner: Phase & Day Indicator */}
      <div
        className={`p-4 rounded-3xl border flex items-center justify-between shadow-xl backdrop-blur-md ${
          isNight
            ? 'bg-slate-950/90 border-indigo-900/60 shadow-indigo-950/40 text-indigo-200'
            : 'bg-amber-950/40 border-amber-500/40 shadow-amber-950/40 text-amber-200'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xl shadow-inner ${
              isNight ? 'bg-indigo-950 border border-indigo-500/40' : 'bg-amber-950 border border-amber-500/40'
            }`}
          >
            {isNight ? <Moon className="w-5 h-5 text-indigo-400" /> : <Sun className="w-5 h-5 text-amber-400" />}
          </div>
          <div>
            <div className="text-xs uppercase font-bold tracking-wider opacity-80">
              {isNight ? `Nacht ${roomState.dayNumber}` : `Dag ${roomState.dayNumber}`}
            </div>
            <div className="font-cinzel font-bold text-sm text-white">
              {currentPhase === 'night_seer' && 'Zienster Ontwaakt'}
              {currentPhase === 'night_werewolves' && 'Weerwolven Jagen'}
              {currentPhase === 'night_witch' && 'Heksenbrouwsels'}
              {currentPhase === 'night_guard' && 'Beschermer Waakt'}
              {currentPhase === 'night_cupido' && 'Cupido Brengt Liefde'}
              {currentPhase === 'night_thief' && 'Dief Kiest Identiteit'}
              {currentPhase === 'night_flute' && 'Fluitspeler Melodie'}
              {currentPhase === 'night_end_summary' && 'Het Dorp Ontwaakt...'}
              {currentPhase === 'day_discussion' && 'Dorpsberaad & Discussie'}
              {currentPhase === 'day_voting' && 'Dorpsstemming / Lynch'}
              {currentPhase === 'day_hunter_revenge' && 'Jager Lost Schot!'}
              {currentPhase === 'game_over' && 'Spel Afgelopen!'}
            </div>
          </div>
        </div>

        {/* Alive badge */}
        {!myPlayer.isAlive ? (
          <span className="px-3 py-1 rounded-full bg-red-950 text-red-400 border border-red-800 text-xs font-bold flex items-center gap-1">
            <Skull className="w-3.5 h-3.5" /> Dood
          </span>
        ) : (
          <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-semibold">
            {myPlayer.name}
          </span>
        )}
      </div>

      {/* Main Interactive Action Box based on Phase & Player Role */}
      {currentPhase === 'game_over' ? (
        <div className="p-6 rounded-3xl bg-slate-900 border-2 border-amber-500/50 text-center space-y-4 shadow-2xl">
          <div className="text-4xl">🏆</div>
          <h2 className="text-2xl font-cinzel font-bold text-amber-300">
            {roomState.winner === 'village' && 'De Burgers Hebben Gewonnen!'}
            {roomState.winner === 'werewolves' && 'De Weerwolven Hebben Gewonnen!'}
            {roomState.winner === 'lovers' && 'De Geliefden Hebben Gewonnen!'}
            {roomState.winner === 'solo' && 'De Fluitspeler Heeft Gewonnen!'}
          </h2>
          <p className="text-xs text-slate-300">{roomState.winReason}</p>
        </div>
      ) : !myPlayer.isAlive && currentPhase !== 'day_hunter_revenge' ? (
        <div className="p-6 rounded-3xl bg-slate-900/90 border border-red-900/60 text-center space-y-3">
          <Skull className="w-12 h-12 text-red-500 mx-auto animate-pulse" />
          <h3 className="font-cinzel text-lg font-bold text-red-300">Je bent geëlimineerd</h3>
          <p className="text-xs text-slate-400">
            Doden kunnen niet meer praten of stemmen. Kijk in stilte toe hoe het drama zich ontvouwt!
          </p>
        </div>
      ) : (
        <>
          {/* SEER NIGHT ACTION */}
          {currentPhase === 'night_seer' && myPlayer.role === 'zienster' && (
            <div className="p-5 rounded-3xl bg-indigo-950/80 border-2 border-indigo-500/60 shadow-2xl space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🔮</span>
                <div>
                  <h3 className="font-cinzel font-bold text-white text-base">Kristallen Bol Inzicht</h3>
                  <p className="text-xs text-indigo-300">Kies één dorpsbewoner om diens ware rol te onthullen:</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {otherAlivePlayers.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      onSendAction({ type: 'SEER_PEEK', payload: { targetId: p.id } });
                      sounds.playPotionBubble();
                    }}
                    className={`p-3 rounded-2xl border text-xs font-semibold text-left transition ${
                      seerPeekResult?.targetId === p.id
                        ? 'bg-indigo-600 text-white border-indigo-400 shadow-lg shadow-indigo-950'
                        : 'bg-slate-900/90 border-slate-700 text-slate-200 hover:border-indigo-400'
                    }`}
                  >
                    <p className="truncate">{p.name}</p>
                    {seerPeekResult?.targetId === p.id && (
                      <p className="text-[11px] text-amber-300 font-bold mt-1">
                        Rol: {ALL_ROLES[seerPeekResult.role]?.dutchName}
                      </p>
                    )}
                  </button>
                ))}
              </div>

              {seerPeekResult && (
                <div className="p-4 rounded-2xl bg-indigo-900/60 border border-indigo-400/50 text-center space-y-1 animate-fadeIn">
                  <p className="text-xs text-indigo-200">De bol toont de ziel van {seerPeekResult.targetName}:</p>
                  <p className="text-xl font-cinzel font-bold text-amber-300 flex items-center justify-center gap-2">
                    <span>{ALL_ROLES[seerPeekResult.role]?.icon}</span>
                    <span>{ALL_ROLES[seerPeekResult.role]?.dutchName}</span>
                  </p>
                </div>
              )}
            </div>
          )}

          {/* WEREWOLF NIGHT ACTION */}
          {currentPhase === 'night_werewolves' && myPlayer.role === 'weerwolf' && (
            <div className="p-5 rounded-3xl bg-red-950/80 border-2 border-red-600/60 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🐺</span>
                  <div>
                    <h3 className="font-cinzel font-bold text-white text-base">Weerwolven Roedel</h3>
                    <p className="text-xs text-red-300">Kies samen in stilte één dorpsslachtoffer:</p>
                  </div>
                </div>
              </div>

              {/* Target Voting */}
              <div className="grid grid-cols-2 gap-2">
                {otherAlivePlayers
                  .filter((p) => p.role !== 'weerwolf')
                  .map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        onSendAction({ type: 'WOLF_VOTE', payload: { targetId: p.id } });
                        sounds.playHeartbeat();
                      }}
                      className={`p-3 rounded-2xl border text-xs font-semibold text-left transition ${
                        myWolfVote === p.id
                          ? 'bg-red-600 text-white border-red-400 shadow-lg shadow-red-950'
                          : 'bg-slate-900/90 border-slate-700 text-slate-200 hover:border-red-400'
                      }`}
                    >
                      <p className="truncate">{p.name}</p>
                      {roomState.nightDecisions.werewolfTarget === p.id && (
                        <p className="text-[10px] text-red-300 font-bold mt-0.5 flex items-center gap-1">
                          <Flame className="w-3 h-3 text-red-400" /> Doelwit
                        </p>
                      )}
                    </button>
                  ))}
              </div>

              {/* Pack Chat */}
              <div className="pt-2 border-t border-red-900/60 space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-red-300 flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" /> Geheime Roedel Chat:
                </span>
                <div className="max-h-28 overflow-y-auto space-y-1 p-2 rounded-xl bg-slate-950/80 border border-red-900/40 text-xs">
                  {roomState.nightDecisions.werewolfChat?.map((chat, idx) => (
                    <div key={idx} className="text-slate-200">
                      <strong className="text-red-400">{chat.senderName}:</strong> {chat.text}
                    </div>
                  ))}
                </div>
                <form onSubmit={handleSendWolfChat} className="flex gap-2">
                  <input
                    type="text"
                    value={wolfChatText}
                    onChange={(e) => setWolfChatText(e.target.value)}
                    placeholder="Fluister naar roedel..."
                    className="flex-1 px-3 py-1.5 rounded-xl bg-slate-950 border border-red-900/60 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-xl bg-red-600 text-white font-bold text-xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* WITCH NIGHT ACTION */}
          {currentPhase === 'night_witch' && myPlayer.role === 'heks' && (
            <div className="p-5 rounded-3xl bg-emerald-950/80 border-2 border-emerald-500/60 shadow-2xl space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🧙‍♀️</span>
                <div>
                  <h3 className="font-cinzel font-bold text-white text-base">Heksenkrachten</h3>
                  <p className="text-xs text-emerald-300">Gebruik je magische brouwsels verstandig:</p>
                </div>
              </div>

              {/* Victim notice */}
              {roomState.nightDecisions.werewolfTarget ? (
                <div className="p-3 rounded-2xl bg-slate-900 border border-emerald-500/40 text-xs space-y-2">
                  <p className="text-slate-300">
                    Aangevallen door weerwolven:{' '}
                    <strong className="text-red-400 text-sm">
                      {roomState.players.find((p) => p.id === roomState.nightDecisions.werewolfTarget)?.name}
                    </strong>
                  </p>
                  {!myPlayer.hasHealed && (
                    <button
                      onClick={() => {
                        onSendAction({ type: 'WITCH_ACTION', payload: { heal: true } });
                        sounds.playPotionBubble();
                      }}
                      className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow"
                    >
                      🧪 Red dit slachtoffer met Levenselixer
                    </button>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">De weerwolven hebben vannacht niemand aangevallen.</p>
              )}

              {/* Poison option */}
              {!myPlayer.hasPoisoned && (
                <div className="space-y-2 pt-2 border-t border-emerald-900/60">
                  <p className="text-xs font-semibold text-emerald-300">Dodelijk Vergif Drank:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {otherAlivePlayers.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          onSendAction({ type: 'WITCH_ACTION', payload: { heal: false, poisonTargetId: p.id } });
                          sounds.playPotionBubble();
                        }}
                        className="p-2 rounded-xl bg-slate-900 border border-slate-700 hover:border-emerald-400 text-xs text-left truncate text-slate-200"
                      >
                        ☠️ Vergiftig {p.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* GUARD NIGHT ACTION */}
          {currentPhase === 'night_guard' && myPlayer.role === 'beschermer' && (
            <div className="p-5 rounded-3xl bg-cyan-950/80 border-2 border-cyan-500/60 shadow-2xl space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🛡️</span>
                <div>
                  <h3 className="font-cinzel font-bold text-white text-base">Bescherming Bieden</h3>
                  <p className="text-xs text-cyan-300">Kies een speler om vannacht te beschermen:</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {alivePlayers.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      onSendAction({ type: 'GUARD_PROTECT', payload: { targetId: p.id } });
                      sounds.playHeartbeat();
                    }}
                    className={`p-3 rounded-2xl border text-xs font-semibold text-left transition ${
                      roomState.nightDecisions.guardTarget === p.id
                        ? 'bg-cyan-600 text-white border-cyan-400 shadow'
                        : 'bg-slate-900/90 border-slate-700 text-slate-200'
                    }`}
                  >
                    {p.name} {p.id === myPlayerId && '(Jijzelf)'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* CUPID NIGHT ACTION */}
          {currentPhase === 'night_cupido' && myPlayer.role === 'cupido' && (
            <div className="p-5 rounded-3xl bg-rose-950/80 border-2 border-rose-500/60 shadow-2xl space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">💘</span>
                <div>
                  <h3 className="font-cinzel font-bold text-white text-base">Koppel Twee Geliefden</h3>
                  <p className="text-xs text-rose-300">Wijs 2 spelers aan voor eeuwige liefde:</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {alivePlayers.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      const current = roomState.nightDecisions.cupidLovers || ['', ''];
                      if (!current[0]) {
                        onSendAction({ type: 'CUPID_LINK', payload: { lover1Id: p.id, lover2Id: current[1] || '' } });
                      } else {
                        onSendAction({ type: 'CUPID_LINK', payload: { lover1Id: current[0], lover2Id: p.id } });
                      }
                      sounds.playHeartbeat();
                    }}
                    className="p-3 rounded-2xl bg-slate-900 border border-slate-700 text-xs font-semibold text-left text-slate-200"
                  >
                    ❤️ {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* FLUTE PLAYER NIGHT ACTION */}
          {currentPhase === 'night_flute' && myPlayer.role === 'fluitspeler' && (
            <div className="p-5 rounded-3xl bg-fuchsia-950/80 border-2 border-fuchsia-500/60 shadow-2xl space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🪈</span>
                <div>
                  <h3 className="font-cinzel font-bold text-white text-base">Hypnotiserende Melodie</h3>
                  <p className="text-xs text-fuchsia-300">Betover vannacht twee dorpsbewoners:</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {otherAlivePlayers
                  .filter((p) => !p.isEnchanted)
                  .map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        onSendAction({ type: 'FLUTE_ENCHANT', payload: { targets: [p.id] } });
                        sounds.playHeartbeat();
                      }}
                      className="p-3 rounded-2xl bg-slate-900 border border-slate-700 text-xs font-semibold text-left text-slate-200"
                    >
                      ✨ Betover {p.name}
                    </button>
                  ))}
              </div>
            </div>
          )}

          {/* DAY VOTING INTERFACE */}
          {currentPhase === 'day_voting' && myPlayer.isAlive && (
            <div className="p-5 rounded-3xl bg-slate-900/90 border-2 border-amber-500/60 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Vote className="w-5 h-5 text-amber-400" />
                  <div>
                    <h3 className="font-cinzel font-bold text-white text-base">Breng Jouw Stem Uit</h3>
                    <p className="text-xs text-slate-400">Wie is volgens jou een weerwolf?</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {otherAlivePlayers.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      onSendAction({ type: 'CAST_DAY_VOTE', payload: { targetId: p.id } });
                      sounds.playHeartbeat();
                    }}
                    className={`p-3 rounded-2xl border text-xs font-semibold text-left transition ${
                      myVote === p.id
                        ? 'bg-amber-500 text-slate-950 font-bold border-amber-300 shadow-lg shadow-amber-950'
                        : 'bg-slate-950 border-slate-700 text-slate-200 hover:border-amber-400'
                    }`}
                  >
                    <p className="truncate">{p.name}</p>
                    {myVote === p.id && <p className="text-[10px] text-slate-950 mt-1">✓ Jouw stem</p>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* HUNTER REVENGE INTERFACE */}
          {currentPhase === 'day_hunter_revenge' && roomState.hunterPendingShooterId === myPlayerId && (
            <div className="p-5 rounded-3xl bg-red-950 border-2 border-red-500 shadow-2xl space-y-4 animate-pulse">
              <div className="flex items-center gap-2">
                <Crosshair className="w-6 h-6 text-red-400" />
                <div>
                  <h3 className="font-cinzel font-bold text-white text-base">Jagers Laatste Schot!</h3>
                  <p className="text-xs text-red-300">Je sterft, maar mag 1 speler mee het graf in nemen:</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {alivePlayers.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      onSendAction({ type: 'HUNTER_REVENGE', payload: { targetId: p.id } });
                      sounds.playMidnightGong();
                    }}
                    className="p-3 rounded-2xl bg-red-900 border border-red-500 text-white font-bold text-xs text-left shadow-lg"
                  >
                    🎯 Schiet op {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* SLEEPING NIGHT NOTICE FOR PASSIVE ROLES */}
          {isNight &&
            !['night_seer', 'night_werewolves', 'night_witch', 'night_guard', 'night_cupido', 'night_thief', 'night_flute'].includes(
              currentPhase
            ) && (
              <div className="p-6 rounded-3xl bg-slate-900/90 border border-indigo-900/50 text-center space-y-2">
                <Moon className="w-8 h-8 text-indigo-400 mx-auto animate-pulse" />
                <h4 className="font-cinzel text-base font-bold text-indigo-200">De Nacht Is In Volle Gang</h4>
                <p className="text-xs text-slate-400">
                  De spelleider roept de ontwakende karakters om de beurt op. Houd je ogen gesloten en wacht in stilte!
                </p>
              </div>
            )}
        </>
      )}

      {/* Secret Card View Component */}
      <div className="pt-2">
        <RoleCard player={myPlayer} loverPlayer={loverPlayer} hideSecret={true} />
      </div>

      {/* Village Players Graveyard / Status List */}
      <div className="p-4 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
          <span>Dorpsbewoners ({alivePlayers.length} levend / {roomState.players.length} totaal)</span>
        </h4>
        <div className="grid grid-cols-2 gap-2">
          {roomState.players.map((p) => (
            <div
              key={p.id}
              className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                p.isAlive
                  ? 'bg-slate-950/70 border-slate-800 text-slate-200'
                  : 'bg-red-950/40 border-red-900/50 text-slate-500 opacity-60'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <div
                  className="w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-bold text-slate-950"
                  style={{ backgroundColor: p.avatarColor || '#f59e0b' }}
                >
                  {p.name.substring(0, 1).toUpperCase()}
                </div>
                <span className="truncate">{p.name}</span>
              </div>
              {!p.isAlive && <Skull className="w-3.5 h-3.5 text-red-500 shrink-0" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
