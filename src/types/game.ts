/**
 * Types and interfaces for Werewolves / Weerwolven Companion & Multiplayer
 */

export type RoleId =
  | 'burger'
  | 'weerwolf'
  | 'zienster'
  | 'heks'
  | 'jager'
  | 'cupido'
  | 'beschermer'
  | 'dief'
  | 'dorpsoudste'
  | 'meisje'
  | 'fluitspeler'
  | 'burgemeester'
  | 'onbekend';

export type Team = 'village' | 'werewolves' | 'lovers' | 'solo';

export interface RoleDefinition {
  id: RoleId;
  name: string;
  dutchName: string;
  team: Team;
  icon: string;
  badgeColor: string;
  cardBg: string;
  borderColor: string;
  nightOrder: number; // 0 = no night wake up, 1, 2, 3...
  wakesEveryNight: boolean;
  wakesFirstNightOnly: boolean;
  description: string;
  nightInstruction: string;
  scriptLinesDutch: string[];
  scriptLinesEnglish: string[];
  maxCount?: number;
}

export type Phase =
  | 'lobby'
  | 'night_thief'
  | 'night_cupido'
  | 'night_guard'
  | 'night_seer'
  | 'night_werewolves'
  | 'night_witch'
  | 'night_flute'
  | 'night_end_summary'
  | 'day_discussion'
  | 'day_voting'
  | 'day_hunter_revenge'
  | 'day_mayor_election'
  | 'game_over';

export interface Player {
  id: string;
  name: string;
  role: RoleId;
  originalRole?: RoleId;
  isAlive: boolean;
  isMayor: boolean;
  isLoverWith?: string; // Player ID of lover
  isProtected?: boolean; // Protected this night
  lastProtected?: boolean; // Protected last night (can't protect 2 in a row)
  isEnchanted?: boolean; // Flute player charm
  hasHealed?: boolean; // Witch used life potion
  hasPoisoned?: boolean; // Witch used poison potion
  elderLives?: number; // 2 lives for Dorpsoudste
  diedInPhase?: Phase;
  deathReason?: 'werewolves' | 'witch' | 'vote' | 'hunter' | 'lover_heartbreak' | 'spelleider';
  avatarColor: string;
  isHost?: boolean;
  lastSeen?: number;
  isOnline?: boolean;
}

export interface GameLog {
  id: string;
  timestamp: string;
  phase: Phase;
  dayNumber: number;
  message: string;
  isSecret?: boolean; // Secret narrator / wolf-only log
  category: 'death' | 'action' | 'phase' | 'system' | 'vote' | 'love';
}

export interface WolfVote {
  voterId: string;
  targetId: string;
}

export interface DayVote {
  voterId: string;
  targetId: string;
}

export interface NightDecisions {
  cupidLovers?: [string, string];
  thiefChosenRole?: RoleId;
  thiefExtraCards?: RoleId[];
  guardTarget?: string;
  seerCheckedTarget?: string;
  seerRevealedRole?: RoleId;
  werewolfTarget?: string;
  werewolfVotes?: Record<string, string>; // voterId -> targetId
  werewolfChat?: { senderId: string; senderName: string; text: string; time: string }[];
  witchHealTarget?: string;
  witchPoisonTarget?: string;
  fluteTargets?: string[];
  pendingNightDeaths?: {
    playerId: string;
    reason: 'werewolves' | 'witch';
  }[];
}

export interface GameSettings {
  language: 'nl' | 'en';
  discussionTimeSeconds: number;
  votingTimeSeconds: number;
  nightTimeSeconds: number;
  allowWolfChat: boolean;
  seerShowsRealCard: boolean; // if false, shows team only
  anonymousVoting: boolean;
  soundEffectsEnabled: boolean;
  theme: 'dark' | 'fantasy' | 'midnight';
}

export interface GameRoomState {
  roomCode: string;
  hostId: string;
  phase: Phase;
  dayNumber: number;
  phaseTimerRemaining: number;
  phaseTimerMax: number;
  timerActive: boolean;
  players: Player[];
  selectedDeck: RoleId[];
  nightDecisions: NightDecisions;
  dayVotes: Record<string, string>; // voterId -> targetId
  logs: GameLog[];
  winner: Team | null;
  winReason?: string;
  hunterPendingShooterId?: string;
  mayorPendingDeciderId?: string;
  settings: GameSettings;
  createdAt: number;
  updatedAt: number;
}

// Client-Server WS message types
export type WsClientAction =
  | { type: 'CREATE_ROOM'; payload: { hostName: string; settings?: Partial<GameSettings> } }
  | { type: 'JOIN_ROOM'; payload: { roomCode: string; playerName: string; playerId?: string } }
  | { type: 'UPDATE_DECK'; payload: { deck: RoleId[] } }
  | { type: 'UPDATE_SETTINGS'; payload: { settings: Partial<GameSettings> } }
  | { type: 'START_GAME'; payload: {} }
  | { type: 'NEXT_PHASE'; payload: { targetPhase?: Phase } }
  | { type: 'PREV_PHASE'; payload: {} }
  | { type: 'SEER_PEEK'; payload: { targetId: string } }
  | { type: 'WOLF_VOTE'; payload: { targetId: string } }
  | { type: 'WOLF_MESSAGE'; payload: { text: string } }
  | { type: 'WITCH_ACTION'; payload: { heal: boolean; poisonTargetId?: string } }
  | { type: 'GUARD_PROTECT'; payload: { targetId: string } }
  | { type: 'CUPID_LINK'; payload: { lover1Id: string; lover2Id: string } }
  | { type: 'THIEF_CHOOSE'; payload: { chosenRole: RoleId } }
  | { type: 'FLUTE_ENCHANT'; payload: { targets: string[] } }
  | { type: 'CAST_DAY_VOTE'; payload: { targetId: string } }
  | { type: 'HUNTER_REVENGE'; payload: { targetId: string } }
  | { type: 'SET_MAYOR'; payload: { targetId: string } }
  | { type: 'KILL_PLAYER'; payload: { playerId: string; reason: Player['deathReason'] } }
  | { type: 'REVIVE_PLAYER'; payload: { playerId: string } }
  | { type: 'CHANGE_PLAYER_ROLE'; payload: { playerId: string; newRole: RoleId } }
  | { type: 'TIMER_CONTROL'; payload: { action: 'start' | 'pause' | 'reset' | 'set'; seconds?: number } }
  | { type: 'START_NEXT_NIGHT'; payload?: {} }
  | { type: 'RESTART_SAME_PLAYERS'; payload?: {} }
  | { type: 'RESET_GAME'; payload: {} }
  | { type: 'EXECUTE_SQL'; payload: { query: string; params?: any[] } };

export type WsServerMessage =
  | { type: 'ROOM_STATE'; payload: { state: GameRoomState; yourPlayerId: string } }
  | { type: 'ERROR'; payload: { message: string } }
  | { type: 'SEER_REVEAL'; payload: { targetId: string; targetName: string; role: RoleId } }
  | { type: 'SOUND_EVENT'; payload: { sound: 'wolf_howl' | 'gong' | 'bubble' | 'rooster' | 'bell' | 'heartbeat' | 'victory' } }
  | { type: 'SQL_RESULT'; payload: { query: string; rows: any[]; columns: string[]; rowCount: number; executionTimeMs: number; error?: string } };
