import React, { useState } from 'react';
import { ALL_ROLES, PLAYABLE_SECRET_ROLES, DECK_PRESETS } from '../utils/roles';
import { RoleId } from '../types/game';
import { SoundBoard } from './SoundBoard';
import {
  Users,
  Plus,
  Minus,
  Trash2,
  Play,
  Moon,
  Sun,
  Volume2,
  Skull,
  Shield,
  Heart,
  Crown,
  Sparkles,
  RotateCcw,
  SkipForward,
  CheckCircle2,
  Edit3,
  UserPlus,
  HelpCircle,
  Flame,
  ArrowRight,
  Sliders,
  Layers,
} from 'lucide-react';
import { sounds } from '../utils/sound';

interface LocalPlayer {
  id: string;
  name: string;
  role: RoleId; // Their secret card (Weerwolf, Zienster, Burger, etc.)
  isMayor: boolean; // Can be held simultaneously with ANY secret role!
  isAlive: boolean;
  isProtected?: boolean;
  isEnchanted?: boolean;
  isLoverWith?: string;
  hasHealed?: boolean;
  hasPoisoned?: boolean;
}

export const LocalGameMasterView: React.FC = () => {
  // Empty player list initially (clean start)
  const [players, setPlayers] = useState<LocalPlayer[]>([]);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerRole, setNewPlayerRole] = useState<RoleId>('onbekend');
  const [bulkNamesInput, setBulkNamesInput] = useState('');
  const [showBulkAdd, setShowBulkAdd] = useState(false);

  // Deck Configuration in the Game
  const [selectedDeck, setSelectedDeck] = useState<RoleId[]>([
    'weerwolf',
    'weerwolf',
    'zienster',
    'heks',
    'burger',
    'burger',
    'burger',
  ]);

  const [gameState, setGameState] = useState<'setup' | 'playing'>('setup');
  const [dayNumber, setDayNumber] = useState(1);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Local night decisions
  const [wolfTarget, setWolfTarget] = useState<string>('');
  const [guardTarget, setGuardTarget] = useState<string>('');
  const [witchHeal, setWitchHeal] = useState<boolean>(false);
  const [witchPoisonTarget, setWitchPoisonTarget] = useState<string>('');
  const [cupidLover1, setCupidLover1] = useState<string>('');
  const [cupidLover2, setCupidLover2] = useState<string>('');
  const [seerPeekTarget, setSeerPeekTarget] = useState<string>('');

  const [morningDeaths, setMorningDeaths] = useState<string[]>([]);

  // Add/Remove role in the physical deck
  const handleAddRoleToDeck = (roleId: RoleId) => {
    setSelectedDeck([...selectedDeck, roleId]);
  };

  const handleRemoveRoleFromDeck = (roleId: RoleId) => {
    const idx = selectedDeck.lastIndexOf(roleId);
    if (idx !== -1) {
      const next = [...selectedDeck];
      next.splice(idx, 1);
      setSelectedDeck(next);
    }
  };

  const handleApplyPreset = (presetRoles: RoleId[]) => {
    setSelectedDeck([...presetRoles]);
  };

  // Step definitions with role assignment helper
  const nightSteps = [
    {
      id: 'night_intro',
      title: 'De Nacht Valt Over Wakkerdam',
      icon: '🌑',
      script: 'Het wordt nacht in het dorp Wakkerdam. Iedereen sluit de ogen en gaat slapen...',
      sound: () => sounds.playMidnightGong(),
      targetRole: null,
      requiredRole: null,
    },
    {
      id: 'cupid',
      title: 'Cupido Ontwaakt (Nacht 1)',
      icon: '💘',
      script: 'Cupido, ontwaak! Wijs twee dorpsbewoners aan die elkaars geliefden worden. Cupido, sluit weer je ogen. (Spelleider tikt geliefden aan): Geliefden, open jullie ogen en herken elkaar!',
      sound: () => sounds.playHeartbeat(),
      targetRole: 'cupido' as RoleId,
      requiredRole: 'cupido' as RoleId,
    },
    {
      id: 'guard',
      title: 'Beschermer / Lijfwacht Ontwaakt',
      icon: '🛡️',
      script: 'Beschermer, ontwaak! Wijs één speler aan die je vannacht wilt verdedigen tegen de weerwolven. Beschermer, sluit je ogen.',
      sound: () => sounds.playMidnightGong(),
      targetRole: 'beschermer' as RoleId,
      requiredRole: 'beschermer' as RoleId,
    },
    {
      id: 'seer',
      title: 'Zienster Ontwaakt',
      icon: '🔮',
      script: 'Zienster, word wakker! Wijs één speler aan wiens geheime kaart je wilt zien. (Spelleider toont rol in stilte). Zienster, slaap weer in.',
      sound: () => sounds.playSeerChime(),
      targetRole: 'zienster' as RoleId,
      requiredRole: 'zienster' as RoleId,
    },
    {
      id: 'werewolves',
      title: 'Weerwolven Gaan Op Jacht',
      icon: '🐺',
      script: 'Weerwolven, open de ogen en herken elkaar. Wijs in stilte één dorpsslachtoffer aan! Weerwolven, sluit jullie ogen.',
      sound: () => sounds.playWolfHowl(),
      targetRole: 'weerwolf' as RoleId,
      requiredRole: 'weerwolf' as RoleId,
    },
    {
      id: 'witch',
      title: 'Heks Ontwaakt',
      icon: '🧙‍♀️',
      script: 'Heks, ontwaak! Dit is het slachtoffer van de wolven. Wil je de levensdrank gebruiken? Wil je iemand vergiftigen? Heks, ga weer slapen.',
      sound: () => sounds.playPotionBubble(),
      targetRole: 'heks' as RoleId,
      requiredRole: 'heks' as RoleId,
    },
    {
      id: 'flute',
      title: 'Fluitspeler Ontwaakt',
      icon: '🪈',
      script: 'Fluitspeler, ontwaak! Wijs 2 spelers aan om te betoveren met je melodie. Fluitspeler, slaap weer in. (Spelleider tikt betoverden aan): Betoverden, open jullie ogen en herken elkaar!',
      sound: () => sounds.playHeartbeat(),
      targetRole: 'fluitspeler' as RoleId,
      requiredRole: 'fluitspeler' as RoleId,
    },
    {
      id: 'morning',
      title: 'Ochtendgloren • Het Dorp Wordt Wakker',
      icon: '🌅',
      script: 'De zon komt op boven het dorp. Iedereen mag zijn ogen openen!',
      sound: () => sounds.playDawnAwakening(),
      targetRole: null,
      requiredRole: null,
    },
    {
      id: 'day_debate',
      title: 'Dorpsberaad & Stemming',
      icon: '☀️',
      script: 'Bespreek met elkaar wie er verdacht is en breng jullie stemmen uit om een schuldige te executeren! (De stem van de Burgemeester 👑 telt dubbel bij staking van stemmen).',
      sound: () => sounds.playLynchStrike(),
      targetRole: null,
      requiredRole: null,
    },
  ];

  const currentStep = nightSteps[currentStepIndex] || nightSteps[0];

  const handleAddPlayer = () => {
    if (!newPlayerName.trim()) return;
    const newPlayer: LocalPlayer = {
      id: 'p_' + Math.random().toString(36).substring(2, 9),
      name: newPlayerName.trim(),
      role: newPlayerRole,
      isAlive: true,
      isMayor: false,
    };
    setPlayers([...players, newPlayer]);
    setNewPlayerName('');
  };

  const handleBulkAdd = () => {
    if (!bulkNamesInput.trim()) return;
    const names = bulkNamesInput
      .split(/[\n,]+/)
      .map((n) => n.trim())
      .filter((n) => n.length > 0);

    const newPlayers: LocalPlayer[] = names.map((name) => ({
      id: 'p_' + Math.random().toString(36).substring(2, 9),
      name,
      role: 'onbekend',
      isAlive: true,
      isMayor: false,
    }));

    setPlayers([...players, ...newPlayers]);
    setBulkNamesInput('');
    setShowBulkAdd(false);
  };

  const handleRemovePlayer = (id: string) => {
    setPlayers(players.filter((p) => p.id !== id));
  };

  const handleUpdateRole = (playerId: string, role: RoleId) => {
    setPlayers(players.map((p) => (p.id === playerId ? { ...p, role } : p)));
  };

  const handleToggleAlive = (playerId: string) => {
    setPlayers(
      players.map((p) => (p.id === playerId ? { ...p, isAlive: !p.isAlive } : p))
    );
  };

  // Burgemeester is an honorary title! Toggle on/off without changing secret role.
  const handleToggleMayor = (playerId: string) => {
    setPlayers(
      players.map((p) => ({
        ...p,
        isMayor: p.id === playerId ? !p.isMayor : false,
      }))
    );
  };

  // Direct start next night button
  const handleStartNextNight = () => {
    setDayNumber((prev) => prev + 1);
    setCurrentStepIndex(0);
    setWolfTarget('');
    setGuardTarget('');
    setWitchHeal(false);
    setWitchPoisonTarget('');
    setSeerPeekTarget('');
    sounds.playWolfHowl();
  };

  // Restart game keeping same players
  const handleRestartSamePlayers = () => {
    if (confirm('Wil je een nieuwe ronde starten met dezelfde spelerslijst?')) {
      setDayNumber(1);
      setCurrentStepIndex(0);
      setWolfTarget('');
      setGuardTarget('');
      setWitchHeal(false);
      setWitchPoisonTarget('');
      setSeerPeekTarget('');
      setMorningDeaths([]);
      setPlayers(
        players.map((p) => ({
          ...p,
          isAlive: true,
          isMayor: false,
          isProtected: false,
          isEnchanted: false,
          isLoverWith: undefined,
          hasHealed: false,
          hasPoisoned: false,
          role: 'onbekend',
        }))
      );
      sounds.playMidnightGong();
    }
  };

  const handleNextStep = () => {
    if (currentStep.id === 'witch') {
      const deaths: string[] = [];
      if (wolfTarget && wolfTarget !== guardTarget && !witchHeal) {
        const victim = players.find((p) => p.id === wolfTarget);
        if (victim) {
          deaths.push(victim.name);
          victim.isAlive = false;
        }
      }
      if (witchPoisonTarget) {
        const victim = players.find((p) => p.id === witchPoisonTarget);
        if (victim && !deaths.includes(victim.name)) {
          deaths.push(victim.name);
          victim.isAlive = false;
        }
      }
      setMorningDeaths(deaths);
    }

    if (currentStepIndex < nightSteps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
      nightSteps[currentStepIndex + 1].sound?.();
    } else {
      handleStartNextNight();
    }
  };

  const alivePlayers = players.filter((p) => p.isAlive);
  const deadPlayers = players.filter((p) => !p.isAlive);

  // Group deck roles for counting
  const deckRoleCounts = PLAYABLE_SECRET_ROLES.map((role) => ({
    role,
    count: selectedDeck.filter((r) => r === role.id).length,
  }));

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6 animate-fadeIn">
      {/* Mode Header */}
      <div className="p-6 rounded-3xl bg-slate-900 border-2 border-amber-500/40 shadow-2xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 text-xs font-bold uppercase tracking-wider">
              Offline / Fysiek Tafel Spel
            </span>
            <h2 className="text-2xl sm:text-3xl font-cinzel font-bold text-white mt-1">
              Spelleider Assistent (Tafeldashboard)
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {gameState === 'playing' && (
              <>
                <button
                  onClick={handleStartNextNight}
                  className="px-4 py-2 rounded-xl bg-indigo-900/80 hover:bg-indigo-800 border border-indigo-500/50 text-indigo-200 text-xs font-bold flex items-center gap-1.5 transition shadow"
                >
                  <Moon className="w-3.5 h-3.5" />
                  <span>Start Nieuwe Nacht</span>
                </button>
                <button
                  onClick={handleRestartSamePlayers}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition"
                  title="Nieuw spel met zelfde spelers"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Opnieuw Spelen</span>
                </button>
              </>
            )}
          </div>
        </div>

        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
          💡 <strong>Kies hieronder welke rollen er in het spel zitten!</strong> Je hoeft vooraf niet te weten wie welke rol heeft gekregen. Wijs de rollen eenvoudig toe zodra de spelers ontwaken.
        </p>
      </div>

      {gameState === 'setup' ? (
        <div className="space-y-6">
          {/* STEP 1: ROLLEN KIEZEN (Deck Builder) */}
          <div className="p-6 rounded-3xl bg-slate-900/90 border border-amber-500/30 space-y-4 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-cinzel font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-400" />
                  <span>1. Kies Welke Rollen Er In Zitten ({selectedDeck.length} kaarten)</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Stel het fysieke kaartendeck samen dat je aan de spelers uitdeelt.
                </p>
              </div>

              {/* Status pill comparing deck size to players */}
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs px-3 py-1 rounded-xl font-mono font-bold border ${
                    selectedDeck.length === players.length && players.length > 0
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-600'
                      : 'bg-slate-950 text-amber-300 border-amber-500/40'
                  }`}
                >
                  {selectedDeck.length} Kaarten in Deck / {players.length} Spelers
                </span>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Snelle Rollen Presets:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {DECK_PRESETS.map((preset, i) => (
                  <button
                    key={i}
                    onClick={() => handleApplyPreset(preset.roles)}
                    className="p-3 rounded-2xl bg-slate-950 border border-slate-800 hover:border-amber-500/50 text-left transition text-xs space-y-1 hover:bg-slate-900"
                  >
                    <p className="font-bold text-amber-300">{preset.name}</p>
                    <p className="text-[10px] text-slate-400 line-clamp-2">{preset.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Role Increment/Decrement Grid */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Karakters & Aantallen Aanpassen (+ / -):
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                {deckRoleCounts.map(({ role, count }) => (
                  <div
                    key={role.id}
                    className={`p-2.5 rounded-2xl border flex items-center justify-between gap-2 transition ${
                      count > 0
                        ? 'bg-slate-950 border-amber-500/40 text-white'
                        : 'bg-slate-950/40 border-slate-800 text-slate-500'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-xl shrink-0">{role.icon}</span>
                      <div className="truncate">
                        <p className="text-xs font-bold truncate leading-tight">{role.dutchName}</p>
                        <span className="text-[10px] text-amber-400 font-mono font-bold">
                          {count}x in spel
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleRemoveRoleFromDeck(role.id)}
                        disabled={count === 0}
                        className="w-6 h-6 rounded-lg bg-slate-900 hover:bg-red-950 hover:text-red-300 disabled:opacity-30 border border-slate-700 flex items-center justify-center text-xs"
                        title="Eén minder"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleAddRoleToDeck(role.id)}
                        className="w-6 h-6 rounded-lg bg-slate-900 hover:bg-emerald-950 hover:text-emerald-300 border border-slate-700 flex items-center justify-center text-xs"
                        title="Eén meer toevoegen"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Mayor Note */}
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 flex items-start gap-2.5">
              <Crown className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p>
                <strong>Burgemeester 👑</strong> is geen geheime kaart in het deck, maar een <strong>ambtsketen / eretitel</strong> die aan elke levende speler (ongeacht hun rol zoals Weerwolf, Burger of Zienster) kan worden gegeven met de 👑 knop.
              </p>
            </div>
          </div>

          {/* STEP 2: SPELERS TOEVOEGEN & ROSTER */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Add Player Box */}
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-cinzel font-bold text-white flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-amber-400" />
                  <span>2. Spelers Invoeren</span>
                </h3>
                <button
                  onClick={() => setShowBulkAdd(!showBulkAdd)}
                  className="text-xs text-amber-400 hover:underline"
                >
                  {showBulkAdd ? 'Enkele invoer' : 'Meerdere tegelijk'}
                </button>
              </div>

              {showBulkAdd ? (
                <div className="space-y-3">
                  <label className="block text-xs font-medium text-slate-300">
                    Plak alle namen (gescheiden door komma of enter):
                  </label>
                  <textarea
                    rows={4}
                    value={bulkNamesInput}
                    onChange={(e) => setBulkNamesInput(e.target.value)}
                    placeholder="Peter, Lisa, Thomas, Fatima, Bram..."
                    className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500 resize-none font-sans"
                  />
                  <button
                    onClick={handleBulkAdd}
                    className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition"
                  >
                    <Plus className="w-4 h-4" /> Voeg Alle Namen Toe
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Spelersnaam</label>
                    <input
                      type="text"
                      value={newPlayerName}
                      onChange={(e) => setNewPlayerName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddPlayer()}
                      placeholder="Bijv. Lisa"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Rol (Optioneel - kan ook tijdens nacht):
                    </label>
                    <select
                      value={newPlayerRole}
                      onChange={(e) => setNewPlayerRole(e.target.value as RoleId)}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
                    >
                      <option value="onbekend">❓ Onbekend (Ontdekken tijdens nacht)</option>
                      {PLAYABLE_SECRET_ROLES.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.icon} {r.dutchName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={handleAddPlayer}
                    disabled={!newPlayerName.trim()}
                    className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition"
                  >
                    <Plus className="w-4 h-4" /> Speler Toevoegen
                  </button>
                </div>
              )}
            </div>

            {/* Players Roster */}
            <div className="md:col-span-2 p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-cinzel font-bold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-400" />
                  <span>Spelerslijst ({players.length})</span>
                </h3>
                <button
                  onClick={() => {
                    setGameState('playing');
                    setCurrentStepIndex(0);
                    sounds.playMidnightGong();
                  }}
                  disabled={players.length < 3}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 disabled:opacity-40 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-950/50 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-white" /> Start Nachtwizard ({players.length} spelers)
                </button>
              </div>

              {players.length === 0 ? (
                <div className="p-12 text-center rounded-2xl bg-slate-950/60 border border-dashed border-slate-800 text-slate-400 space-y-2">
                  <Users className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-sm font-semibold text-slate-300">Nog geen spelers ingevoerd</p>
                  <p className="text-xs text-slate-500">
                    Voer hierboven de namen van de aanwezige vrienden aan tafel in.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[350px] overflow-y-auto pr-1">
                  {players.map((p) => {
                    const roleDef = ALL_ROLES[p.role] || ALL_ROLES.onbekend;
                    return (
                      <div
                        key={p.id}
                        className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs hover:border-amber-500/40 transition"
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <span className="text-xl shrink-0">{roleDef.icon}</span>
                          <div className="truncate">
                            <p className="font-bold text-white flex items-center gap-1 truncate">
                              <span>{p.name}</span>
                              {p.isMayor && (
                                <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />
                              )}
                            </p>
                            <p className="text-[11px] text-amber-400 truncate">
                              {roleDef.dutchName} {p.isMayor && '+ 👑 Burgemeester'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {/* Burgemeester sash toggle */}
                          <button
                            onClick={() => handleToggleMayor(p.id)}
                            className={`p-1.5 rounded-lg border text-[11px] transition ${
                              p.isMayor
                                ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                                : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-amber-300'
                            }`}
                            title={p.isMayor ? 'Burgemeester afzetten' : 'Maak Burgemeester'}
                          >
                            👑
                          </button>

                          {/* Role Selector */}
                          <select
                            value={p.role}
                            onChange={(e) => handleUpdateRole(p.id, e.target.value as RoleId)}
                            className="text-[11px] bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-2 py-1 focus:outline-none"
                          >
                            <option value="onbekend">❓ Onbekend</option>
                            {PLAYABLE_SECRET_ROLES.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.icon} {r.dutchName}
                              </option>
                            ))}
                          </select>

                          <button
                            onClick={() => handleRemovePlayer(p.id)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-950/30"
                            title="Verwijder"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Active Narrative Wizard Mode */
        <div className="space-y-6">
          {/* Step Header */}
          <div className="p-6 rounded-3xl bg-slate-950 border-2 border-amber-500/50 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-center sm:text-left">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-3xl shrink-0">
                {currentStep.icon}
              </div>
              <div>
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <span className="text-xs uppercase font-bold tracking-widest text-amber-400">
                    Nacht {dayNumber} • Stap {currentStepIndex + 1}/{nightSteps.length}
                  </span>
                  <span className="text-xs text-slate-400">
                    ({alivePlayers.length} levend / {deadPlayers.length} dood)
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-cinzel font-bold text-white">
                  {currentStep.title}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleNextStep}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg cursor-pointer"
              >
                <span>Volgende Stap &gt;&gt;</span>
                <SkipForward className="w-4 h-4" />
              </button>
              <button
                onClick={() => setGameState('setup')}
                className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white"
                title="Terug naar spelers- & rollenlijst"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Script Narration Box */}
          <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Volume2 className="w-4 h-4" />
              <span>Spreek luid uit naar de spelers:</span>
            </h3>
            <p className="text-base sm:text-lg text-slate-100 italic bg-slate-950 p-4 rounded-2xl border border-slate-800 font-serif leading-relaxed">
              "{currentStep.script}"
            </p>
          </div>

          {/* Dynamic Role Discover & Assignment Panel */}
          {currentStep.targetRole && (
            <div className="p-5 rounded-3xl bg-slate-900/90 border border-amber-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-amber-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Wie heeft zojuist de ogen geopend als{' '}
                  <strong className="text-white font-bold">
                    {ALL_ROLES[currentStep.targetRole]?.dutchName}
                  </strong>
                  ? (Tik op speler om geheime rol vast te leggen):
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {players.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleUpdateRole(p.id, currentStep.targetRole!)}
                    className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition flex items-center justify-between ${
                      p.role === currentStep.targetRole
                        ? 'bg-amber-500 text-slate-950 font-bold border-amber-300 shadow'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-amber-400'
                    }`}
                  >
                    <span className="truncate">{p.name}</span>
                    {p.role === currentStep.targetRole && <span>✓</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step Specific Action Selectors */}
          {currentStep.id === 'werewolves' && (
            <div className="p-6 rounded-3xl bg-red-950/60 border border-red-800/60 space-y-3">
              <h4 className="text-xs font-bold uppercase text-red-300 flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-red-400" />
                Wijs het weerwolven-slachtoffer aan:
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {players
                  .filter((p) => p.isAlive)
                  .map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setWolfTarget(p.id)}
                      className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition ${
                        wolfTarget === p.id
                          ? 'bg-red-600 text-white border-red-400 shadow-lg'
                          : 'bg-slate-950 border-slate-800 text-slate-200 hover:border-red-400'
                      }`}
                    >
                      {p.name} {p.role === 'weerwolf' && '(Wolf)'}
                    </button>
                  ))}
              </div>
            </div>
          )}

          {currentStep.id === 'guard' && (
            <div className="p-6 rounded-3xl bg-cyan-950/60 border border-cyan-800/60 space-y-3">
              <h4 className="text-xs font-bold uppercase text-cyan-300">
                🛡️ Wie beschermt de beschermer vannacht?
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {players
                  .filter((p) => p.isAlive)
                  .map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setGuardTarget(p.id)}
                      className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition ${
                        guardTarget === p.id
                          ? 'bg-cyan-600 text-white border-cyan-400 shadow'
                          : 'bg-slate-950 border-slate-800 text-slate-200'
                      }`}
                    >
                      {p.name}
                    </button>
                  ))}
              </div>
            </div>
          )}

          {currentStep.id === 'witch' && (
            <div className="p-6 rounded-3xl bg-emerald-950/60 border border-emerald-800/60 space-y-4">
              <h4 className="text-xs font-bold uppercase text-emerald-300">
                🧙‍♀️ Heksenbesluiten vannacht:
              </h4>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => setWitchHeal(!witchHeal)}
                  className={`px-4 py-2 rounded-xl border text-xs font-bold transition ${
                    witchHeal
                      ? 'bg-emerald-600 text-white border-emerald-400 shadow'
                      : 'bg-slate-950 border-slate-700 text-slate-300'
                  }`}
                >
                  🧪 Levensdrank Inzetten: {witchHeal ? 'JA (Slachtoffer gered)' : 'NEE'}
                </button>
              </div>

              <div className="space-y-1.5">
                <span className="text-[11px] text-emerald-300 font-semibold">
                  Dodelijk Vergif Drank (optioneel):
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    onClick={() => setWitchPoisonTarget('')}
                    className={`p-2 rounded-xl border text-xs font-medium text-left ${
                      !witchPoisonTarget ? 'bg-slate-800 text-white border-slate-600' : 'bg-slate-950 text-slate-400'
                    }`}
                  >
                    Geen vergif gebruiken
                  </button>
                  {players
                    .filter((p) => p.isAlive)
                    .map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setWitchPoisonTarget(p.id)}
                        className={`p-2 rounded-xl border text-xs font-medium text-left truncate ${
                          witchPoisonTarget === p.id
                            ? 'bg-red-600 text-white border-red-400'
                            : 'bg-slate-950 border-slate-800 text-slate-200'
                        }`}
                      >
                        ☠️ Vergiftig {p.name}
                      </button>
                    ))}
                </div>
              </div>
            </div>
          )}

          {currentStep.id === 'morning' && (
            <div className="p-6 rounded-3xl bg-slate-900 border-2 border-amber-500/60 shadow-2xl text-center space-y-3">
              <Sun className="w-10 h-10 text-amber-400 mx-auto animate-pulse" />
              <h4 className="font-cinzel text-xl font-bold text-white">
                De Ochtend Breekt Aan!
              </h4>
              {morningDeaths.length > 0 ? (
                <div className="p-4 rounded-2xl bg-red-950/80 border border-red-800 space-y-1">
                  <Skull className="w-6 h-6 text-red-400 mx-auto" />
                  <p className="font-bold text-red-300 text-sm">Overleden vannacht:</p>
                  {morningDeaths.map((name, i) => (
                    <p key={i} className="text-white font-cinzel text-base">
                      ☠️ {name}
                    </p>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-sm font-semibold">
                  🎉 Niemand is vannacht overleden! Wakkerdam heeft de nacht ongeschonden doorstaan.
                </div>
              )}
            </div>
          )}

          {/* Player Status & Role Control Matrix with Mayor 👑 title support */}
          <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-cinzel font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-400" />
                <span>Spelersmatrix (Rollen & Burgemeester)</span>
              </h3>
              <span className="text-xs text-slate-400">
                Burgemeester 👑 telt voor elke rol dubbel bij stemming
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {players.map((p) => {
                const roleDef = ALL_ROLES[p.role] || ALL_ROLES.onbekend;
                return (
                  <div
                    key={p.id}
                    className={`p-3.5 rounded-2xl border transition ${
                      p.isAlive
                        ? 'bg-slate-950/80 border-slate-800 hover:border-amber-500/50'
                        : 'bg-red-950/30 border-red-900/40 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 truncate">
                        <span className="text-2xl">{roleDef.icon}</span>
                        <div className="truncate">
                          <p className="font-bold text-white flex items-center gap-1 truncate">
                            <span>{p.name}</span>
                            {p.isMayor && (
                              <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                            )}
                          </p>
                          <select
                            value={p.role}
                            onChange={(e) => handleUpdateRole(p.id, e.target.value as RoleId)}
                            className="text-[11px] bg-slate-900 border border-slate-700 text-amber-300 font-semibold rounded px-1.5 py-0.5 mt-0.5"
                          >
                            <option value="onbekend">❓ Onbekend</option>
                            {PLAYABLE_SECRET_ROLES.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.icon} {r.dutchName}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <button
                          onClick={() => handleToggleAlive(p.id)}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border transition ${
                            p.isAlive
                              ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                              : 'bg-red-950 text-red-400 border-red-800'
                          }`}
                        >
                          {p.isAlive ? 'LEVEND' : 'DOOD'}
                        </button>
                        <button
                          onClick={() => handleToggleMayor(p.id)}
                          className={`text-[9px] px-2 py-0.5 rounded-md border font-semibold transition ${
                            p.isMayor
                              ? 'bg-amber-500 text-slate-950 font-bold border-amber-400'
                              : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-amber-300'
                          }`}
                        >
                          {p.isMayor ? '👑 Burgemeester (2x stem)' : '+ 👑 Maak Burgemeester'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Soundboard & Ambient Music */}
          <SoundBoard />
        </div>
      )}
    </div>
  );
};
