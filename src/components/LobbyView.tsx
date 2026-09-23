import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { GameRoomState, RoleId, GameSettings } from '../types/game';
import { ALL_ROLES, PLAYABLE_SECRET_ROLES, DECK_PRESETS } from '../utils/roles';
import { Play, Users, Sparkles, Copy, Check, QrCode, Shield, Settings2, Plus, Minus, Crown, ArrowRight } from 'lucide-react';
import { sounds } from '../utils/sound';

interface LobbyViewProps {
  roomState: GameRoomState | null;
  myPlayerId: string;
  onCreateRoom: (hostName: string) => void;
  onJoinRoom: (roomCode: string, playerName: string) => void;
  onUpdateDeck: (deck: RoleId[]) => void;
  onUpdateSettings: (settings: Partial<GameSettings>) => void;
  onStartGame: () => void;
}

export const LobbyView: React.FC<LobbyViewProps> = ({
  roomState,
  myPlayerId,
  onCreateRoom,
  onJoinRoom,
  onUpdateDeck,
  onUpdateSettings,
  onStartGame,
}) => {
  const [hostInputName, setHostInputName] = useState('Spelleider');
  const [joinCode, setJoinCode] = useState('');
  const [joinPlayerName, setJoinPlayerName] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  // Auto-read ?room= query param from URL if present
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam && !roomState) {
      setJoinCode(roomParam.toUpperCase());
    }
  }, [roomState]);

  // Generate QR Code when in room (supports subpaths like /weerwolven/ on GitHub Pages)
  useEffect(() => {
    if (roomState?.roomCode) {
      const pathname = window.location.pathname.endsWith('/') ? window.location.pathname : `${window.location.pathname}/`;
      const joinUrl = `${window.location.origin}${pathname}?room=${roomState.roomCode}`;
      QRCode.toDataURL(joinUrl, { width: 300, margin: 2, color: { dark: '#020617', light: '#f59e0b' } })
        .then((url) => setQrDataUrl(url))
        .catch((e) => console.error('QR error', e));
    }
  }, [roomState?.roomCode]);

  const isHost = roomState ? roomState.hostId === myPlayerId : false;

  const handleCopyLink = () => {
    if (roomState?.roomCode) {
      const pathname = window.location.pathname.endsWith('/') ? window.location.pathname : `${window.location.pathname}/`;
      const joinUrl = `${window.location.origin}${pathname}?room=${roomState.roomCode}`;
      navigator.clipboard.writeText(joinUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleAddRoleToDeck = (roleId: RoleId) => {
    if (!roomState || !isHost) return;
    const newDeck = [...roomState.selectedDeck, roleId];
    onUpdateDeck(newDeck);
  };

  const handleRemoveRoleFromDeck = (index: number) => {
    if (!roomState || !isHost) return;
    const newDeck = roomState.selectedDeck.filter((_, i) => i !== index);
    onUpdateDeck(newDeck);
  };

  // If NOT in a room: Show Join or Create form
  if (!roomState) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12 space-y-8 animate-fadeIn">
        {/* Hero Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" /> Volledig Spelleider Scherm & Telefoon Kaart
          </div>
          <h2 className="text-3xl sm:text-5xl font-cinzel font-black text-amber-100 tracking-wide">
            WEERWOLVEN VAN WAKKERDAM
          </h2>
          <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto leading-relaxed">
            Speel samen met vrienden. Eén spelleider leidt het spel, spelers scannen de QR-code met hun mobiel en zien hun geheime rol en nachtacties!
          </p>
        </div>

        {/* Action Cards: Create vs Join */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* Create Room Box */}
          <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/90 border-2 border-amber-500/40 shadow-2xl backdrop-blur-md flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center text-2xl">
                👑
              </div>
              <h3 className="text-xl font-cinzel font-bold text-white">Nieuw Spel Starten</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Jij bent de Spelleider. Jij beheert het nachtscript, de rollen en timers. Spelers kunnen via hun eigen telefoon meedoen.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Jouw Naam als Spelleider</label>
                <input
                  type="text"
                  value={hostInputName}
                  onChange={(e) => setHostInputName(e.target.value)}
                  placeholder="Bijv. Spelleider Joas"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 text-sm"
                />
              </div>

              <button
                onClick={() => onCreateRoom(hostInputName || 'Spelleider')}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm shadow-lg shadow-amber-950/50 flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
              >
                <span>Kamer Aanmaken</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Join Room Box */}
          <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/90 border-2 border-indigo-500/40 shadow-2xl backdrop-blur-md flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 flex items-center justify-center text-2xl">
                📱
              </div>
              <h3 className="text-xl font-cinzel font-bold text-white">Deelnemen via Telefoon</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Voer de kamercode in van de spelleider om je geheime kaart op je telefoon te ontvangen en live te stemmen.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Kamercode (4 letters/cijfers)</label>
                  <input
                    type="text"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="Bijv. WOLF42"
                    maxLength={10}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-amber-300 font-mono font-bold tracking-widest uppercase placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Jouw Spelersnaam</label>
                  <input
                    type="text"
                    value={joinPlayerName}
                    onChange={(e) => setJoinPlayerName(e.target.value)}
                    placeholder="Jouw naam"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm"
                  />
                </div>
              </div>

              <button
                onClick={() => {
                  if (joinCode && joinPlayerName) {
                    onJoinRoom(joinCode, joinPlayerName);
                  }
                }}
                disabled={!joinCode || !joinPlayerName}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-indigo-950/50 flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
              >
                <span>Meedoen aan Spel</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // IF IN ROOM LOBBY:
  const playerCount = roomState.players.length;
  const deckCount = roomState.selectedDeck.length;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6 animate-fadeIn">
      {/* Lobby Header with Room Code and QR */}
      <div className="p-6 rounded-3xl bg-slate-900/90 border-2 border-amber-500/40 shadow-2xl backdrop-blur-md flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            Lobby Open • Wachten op Spelers
          </div>
          <h2 className="text-2xl sm:text-3xl font-cinzel font-bold text-white flex items-center justify-center md:justify-start gap-3">
            <span>Kamercode:</span>
            <span className="font-mono text-amber-300 px-3 py-1 rounded-xl bg-slate-950 border border-amber-500/40 text-3xl">
              {roomState.roomCode}
            </span>
          </h2>
          <p className="text-xs text-slate-400 max-w-md">
            Laat medespelers deze code invoeren op hun telefoon of de QR-code scannen om direct mee te doen!
          </p>
        </div>

        {/* QR Code & Share link */}
        <div className="flex items-center gap-3">
          {qrDataUrl && (
            <div className="p-2 rounded-2xl bg-amber-400 border-2 border-amber-500 shadow-xl shrink-0">
              <img src={qrDataUrl} alt="Scan QR om mee te doen" className="w-24 h-24 rounded-lg" />
            </div>
          )}
          <div className="flex flex-col gap-2">
            <button
              onClick={handleCopyLink}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-2 transition"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-amber-400" />}
              <span>{copiedLink ? 'Link Gekopieerd!' : 'Kopieer Deellink'}</span>
            </button>
            <div className="text-[11px] text-slate-400 text-center">
              <strong className="text-white">{playerCount}</strong> spelers aangesloten
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Players List vs Deck Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 1 Col: Joined Players */}
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-cinzel font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-400" />
              <span>Spelers ({playerCount})</span>
            </h3>
            <span className="text-xs text-slate-400">Min. 3 vereist</span>
          </div>

          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
            {roomState.players.map((p, idx) => (
              <div
                key={p.id}
                className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-slate-950 text-xs shadow"
                    style={{ backgroundColor: p.avatarColor || '#f59e0b' }}
                  >
                    {p.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-white flex items-center gap-1.5">
                      <span>{p.name}</span>
                      {p.id === roomState.hostId && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-0.5">
                          <Crown className="w-2.5 h-2.5" /> Host
                        </span>
                      )}
                      {p.id === myPlayerId && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          Jij
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Online
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {playerCount < 3 && (
            <p className="text-xs text-amber-400/90 bg-amber-950/40 p-3 rounded-xl border border-amber-500/30 text-center">
              Wacht tot er minimaal 3 spelers zijn aangesloten om te beginnen.
            </p>
          )}
        </div>

        {/* Right 2 Cols: Deck & Role Management */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-cinzel font-bold text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-amber-400" />
                <span>Karakter-Deck & Rollenverdeling ({deckCount} kaarten)</span>
              </h3>
              <p className="text-xs text-slate-400">
                {isHost
                  ? 'Kies een preset of voeg specifieke rollen toe/verwijder ze.'
                  : 'De spelleider stelt het rollendek samen.'}
              </p>
            </div>

            {isHost && (
              <button
                onClick={onStartGame}
                disabled={playerCount < 3}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 disabled:opacity-50 text-white font-bold text-sm shadow-xl shadow-emerald-950/50 flex items-center gap-2 transition active:scale-95 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Start Spel ({playerCount} spelers)</span>
              </button>
            )}
          </div>

          {/* Preset Buttons for Host */}
          {isHost && (
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Snelle Rollen Presets:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {DECK_PRESETS.map((preset, i) => (
                  <button
                    key={i}
                    onClick={() => onUpdateDeck(preset.roles)}
                    className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-amber-500/50 text-left transition text-xs space-y-1 hover:bg-slate-900"
                  >
                    <p className="font-bold text-amber-300">{preset.name}</p>
                    <p className="text-[11px] text-slate-400 line-clamp-2">{preset.description}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Current Deck Composition Chips */}
          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Geselecteerde Rollen in Deck:
            </span>
            <div className="flex flex-wrap gap-2 p-4 rounded-2xl bg-slate-950/80 border border-slate-800 min-h-[100px]">
              {roomState.selectedDeck.map((roleId, idx) => {
                const r = ALL_ROLES[roleId] || ALL_ROLES.burger;
                return (
                  <div
                    key={idx}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium ${r.badgeColor}`}
                  >
                    <span>{r.icon}</span>
                    <span>{r.dutchName}</span>
                    {isHost && (
                      <button
                        onClick={() => handleRemoveRoleFromDeck(idx)}
                        className="p-0.5 rounded-full hover:bg-red-500/30 text-red-400 transition"
                        title="Verwijder rol"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Add more roles panel for Host */}
          {isHost && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Rollen Toevoegen & Deck Samenstellen:
                </span>
                <span className="text-[11px] text-amber-300">
                  👑 Burgemeester is een publieke titel (geen kaart in deck)
                </span>
              </div>

              {/* Pinned Essential Roles Bar: Burgers & Weerwolven are ALWAYS visible and adjustable! */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-red-950/40 border border-amber-500/30 space-y-2 shadow-inner">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Essentiële Basisrollen (Altijd Direct Aanpasbaar)
                  </span>
                  <span className="text-[10px] text-slate-400">Directe +/- zonder van categorie te wisselen</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Pinned Burger */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/90 border border-amber-500/40">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🌾</span>
                      <div>
                        <div className="text-xs font-bold text-amber-200">Burger (Dorpeling)</div>
                        <div className="text-[10px] text-slate-400">
                          {roomState.selectedDeck.filter((r) => r === 'burger').length} in deck
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          const idx = roomState.selectedDeck.lastIndexOf('burger');
                          if (idx !== -1) handleRemoveRoleFromDeck(idx);
                        }}
                        className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700"
                        title="1 Burger minder"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleAddRoleToDeck('burger')}
                        className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1"
                        title="1 Burger toevoegen"
                      >
                        <Plus className="w-3 h-3" /> Toevoegen
                      </button>
                    </div>
                  </div>

                  {/* Pinned Weerwolf */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/90 border border-red-500/40">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🐺</span>
                      <div>
                        <div className="text-xs font-bold text-red-300">Weerwolf (Roedel)</div>
                        <div className="text-[10px] text-slate-400">
                          {roomState.selectedDeck.filter((r) => r === 'weerwolf').length} in deck
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          const idx = roomState.selectedDeck.lastIndexOf('weerwolf');
                          if (idx !== -1) handleRemoveRoleFromDeck(idx);
                        }}
                        className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700"
                        title="1 Weerwolf minder"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleAddRoleToDeck('weerwolf')}
                        className="px-2.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-1"
                        title="1 Weerwolf toevoegen"
                      >
                        <Plus className="w-3 h-3" /> Toevoegen
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Category Filter Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {ROLE_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                      selectedCategory === cat.id
                        ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                        : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>

              {/* Filtered Expansion Roles Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {PLAYABLE_SECRET_ROLES.filter((r) => {
                  if (r.id === 'burger' || r.id === 'weerwolf') return false;
                  if (selectedCategory === 'alle') return true;
                  return r.category === selectedCategory;
                }).map((r) => {
                  const count = roomState.selectedDeck.filter((id) => id === r.id).length;
                  return (
                    <button
                      key={r.id}
                      onClick={() => handleAddRoleToDeck(r.id)}
                      className={`flex items-center justify-between p-2.5 rounded-xl border text-xs text-left transition hover:bg-slate-900 cursor-pointer ${
                        count > 0
                          ? 'bg-slate-900/90 border-amber-500/50'
                          : 'bg-slate-950 border-slate-800 hover:border-amber-500/40'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-base">{r.icon}</span>
                        <div className="truncate">
                          <span className="truncate text-slate-200 block font-medium">{r.dutchName}</span>
                          <span className="text-[10px] text-slate-400">{r.categoryLabel}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {count > 0 && (
                          <span className="px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold">
                            {count}x
                          </span>
                        )}
                        <Plus className="w-3.5 h-3.5 text-amber-400" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
