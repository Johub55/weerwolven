import express, { Request, Response } from 'express';
import http from 'http';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { GameRoomState, Player, RoleId, Phase, GameLog, WsClientAction, WsServerMessage, GameSettings } from './src/types/game';
import { ALL_ROLES } from './src/utils/roles';

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

app.use(express.json());

// In-memory Room Storage
const rooms: Map<string, GameRoomState> = new Map();

// Map WebSocket to metadata
interface SocketMeta {
  ws: WebSocket;
  roomCode?: string;
  playerId?: string;
  isHost?: boolean;
}
const clients: Map<WebSocket, SocketMeta> = new Map();

// Random room code generator (Dutch themed 4-letter words or alphanumeric)
const ROOM_WORDS = ['MAAN', 'WOLF', 'DORP', 'HEKS', 'ZIEN', 'NACHT', 'JAGER', 'BOS', 'ROED', 'STAD'];
function generateRoomCode(): string {
  const word = ROOM_WORDS[Math.floor(Math.random() * ROOM_WORDS.length)];
  const num = Math.floor(10 + Math.random() * 90);
  const code = `${word}${num}`;
  return rooms.has(code) ? Math.random().toString(36).substring(2, 6).toUpperCase() : code;
}

const AVATAR_COLORS = [
  '#f59e0b', '#ef4444', '#10b981', '#6366f1', '#ec4899', '#8b5cf6',
  '#06b6d4', '#14b8a6', '#f97316', '#eab308', '#3b82f6', '#d946ef'
];

function getRandomColor(): string {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}

const DEFAULT_SETTINGS: GameSettings = {
  language: 'nl',
  discussionTimeSeconds: 180,
  votingTimeSeconds: 60,
  nightTimeSeconds: 45,
  allowWolfChat: true,
  seerShowsRealCard: true,
  anonymousVoting: false,
  soundEffectsEnabled: true,
  theme: 'dark',
};

function createInitialRoom(code: string, hostName: string, hostId: string): GameRoomState {
  return {
    roomCode: code,
    hostId,
    phase: 'lobby',
    dayNumber: 0,
    phaseTimerRemaining: 180,
    phaseTimerMax: 180,
    timerActive: false,
    players: [
      {
        id: hostId,
        name: hostName,
        role: 'burger',
        isAlive: true,
        isMayor: false,
        avatarColor: '#f59e0b',
        isHost: true,
        isOnline: true,
        lastSeen: Date.now(),
      },
    ],
    selectedDeck: ['weerwolf', 'weerwolf', 'zienster', 'heks', 'jager', 'burger', 'burger'],
    nightDecisions: {},
    dayVotes: {},
    logs: [
      {
        id: Math.random().toString(36).substring(7),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        phase: 'lobby',
        dayNumber: 0,
        message: `Kamer ${code} geopend door ${hostName}. Wacht op spelers...`,
        category: 'system',
      },
    ],
    winner: null,
    settings: { ...DEFAULT_SETTINGS },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

// Broadcast room state to all sockets in room (with role redaction for non-hosts/non-seer)
function broadcastRoom(roomCode: string, soundEvent?: 'wolf_howl' | 'gong' | 'bubble' | 'rooster' | 'bell' | 'heartbeat' | 'victory') {
  const room = rooms.get(roomCode);
  if (!room) return;

  room.updatedAt = Date.now();

  clients.forEach((meta, ws) => {
    if (meta.roomCode === roomCode && ws.readyState === WebSocket.OPEN) {
      const sanitizedState = sanitizeRoomStateForPlayer(room, meta.playerId);
      const msg: WsServerMessage = {
        type: 'ROOM_STATE',
        payload: {
          state: sanitizedState,
          yourPlayerId: meta.playerId || '',
        },
      };
      ws.send(JSON.stringify(msg));

      if (soundEvent) {
        const soundMsg: WsServerMessage = {
          type: 'SOUND_EVENT',
          payload: { sound: soundEvent },
        };
        ws.send(JSON.stringify(soundMsg));
      }
    }
  });
}

// Ensure secret roles aren't leaked to client inspector during game
function sanitizeRoomStateForPlayer(room: GameRoomState, playerId?: string): GameRoomState {
  const isHost = room.hostId === playerId;
  const isGameOver = room.phase === 'game_over';

  const sanitizedPlayers = room.players.map((p) => {
    // If lobby or game over or host -> show all
    if (room.phase === 'lobby' || isGameOver || isHost) {
      return { ...p };
    }
    // If it is the player's own card
    if (p.id === playerId) {
      return { ...p };
    }
    // If current player is werewolf and target player is also werewolf
    const myPlayer = room.players.find((pl) => pl.id === playerId);
    if (myPlayer?.role === 'weerwolf' && p.role === 'weerwolf') {
      return { ...p };
    }
    // Redact role for other players
    return {
      ...p,
      role: 'burger' as RoleId, // masked role
      originalRole: undefined,
    };
  });

  return {
    ...room,
    players: sanitizedPlayers,
  };
}

// Phase sequencing helpers
function getNextNightPhase(currentPhase: Phase, room: GameRoomState): Phase {
  const activeRoles = new Set(room.players.filter((p) => p.isAlive).map((p) => p.role));
  const isNight1 = room.dayNumber === 1;

  const sequence: Phase[] = [];
  if (isNight1 && room.selectedDeck.includes('cupido')) sequence.push('night_cupido');
  if (isNight1 && room.selectedDeck.includes('dief')) sequence.push('night_thief');
  if (activeRoles.has('beschermer')) sequence.push('night_guard');
  if (activeRoles.has('zienster')) sequence.push('night_seer');
  if (activeRoles.has('weerwolf')) sequence.push('night_werewolves');
  if (activeRoles.has('heks')) sequence.push('night_witch');
  if (activeRoles.has('fluitspeler')) sequence.push('night_flute');
  sequence.push('night_end_summary');

  const currentIndex = sequence.indexOf(currentPhase);
  if (currentIndex === -1 || currentIndex === sequence.length - 1) {
    return sequence[0] || 'night_end_summary';
  }
  return sequence[currentIndex + 1];
}

function checkWinCondition(room: GameRoomState): boolean {
  const alivePlayers = room.players.filter((p) => p.isAlive);
  const aliveWolves = alivePlayers.filter((p) => p.role === 'weerwolf');
  const aliveVillagers = alivePlayers.filter((p) => p.role !== 'weerwolf');

  // Check Fluitspeler win (if all other alive players are enchanted)
  const flutePlayer = alivePlayers.find((p) => p.role === 'fluitspeler');
  if (flutePlayer) {
    const nonFluteAlive = alivePlayers.filter((p) => p.id !== flutePlayer.id);
    if (nonFluteAlive.length > 0 && nonFluteAlive.every((p) => p.isEnchanted)) {
      room.winner = 'solo';
      room.winReason = 'De Fluitspeler heeft alle dorpsbewoners betoverd en wint!';
      room.phase = 'game_over';
      return true;
    }
  }

  // Check Lovers win (if only 2 lovers remain and one is wolf and one is villager)
  if (alivePlayers.length === 2) {
    const p1 = alivePlayers[0];
    const p2 = alivePlayers[1];
    if (p1.isLoverWith === p2.id || p2.isLoverWith === p1.id) {
      room.winner = 'lovers';
      room.winReason = `De Geliefden (${p1.name} & ${p2.name}) hebben samen overleefd! De liefde overwint alles!`;
      room.phase = 'game_over';
      return true;
    }
  }

  // Werewolves win if wolves >= villagers
  if (aliveWolves.length > 0 && aliveWolves.length >= aliveVillagers.length) {
    room.winner = 'werewolves';
    room.winReason = 'De Weerwolven hebben de meerderheid bereikt en het dorp overrompeld!';
    room.phase = 'game_over';
    return true;
  }

  // Village wins if all wolves dead
  if (aliveWolves.length === 0) {
    room.winner = 'village';
    room.winReason = 'Alle Weerwolven zijn verslagen! Wakkerdam is weer veilig!';
    room.phase = 'game_over';
    return true;
  }

  return false;
}

function resolveNightDeaths(room: GameRoomState): string[] {
  const deathNames: string[] = [];
  const deathsToProcess: { playerId: string; reason: Player['deathReason'] }[] = [];

  // Werewolf attack
  const wolfTargetId = room.nightDecisions.werewolfTarget;
  const guardTargetId = room.nightDecisions.guardTarget;
  const witchHealed = room.nightDecisions.witchHealTarget;
  const witchPoisonTarget = room.nightDecisions.witchPoisonTarget;

  if (wolfTargetId) {
    // If not protected by guard and not healed by witch
    if (wolfTargetId !== guardTargetId && wolfTargetId !== witchHealed) {
      const target = room.players.find((p) => p.id === wolfTargetId);
      if (target && target.isAlive) {
        if (target.role === 'dorpsoudste' && (target.elderLives ?? 2) > 1) {
          target.elderLives = (target.elderLives ?? 2) - 1;
          room.logs.unshift({
            id: Math.random().toString(36).substring(7),
            timestamp: new Date().toLocaleTimeString(),
            phase: room.phase,
            dayNumber: room.dayNumber,
            message: `De Dorpsoudste overleefde een dodelijke aanval van de weerwolven dankzij zijn taaiheid!`,
            category: 'action',
          });
        } else {
          deathsToProcess.push({ playerId: wolfTargetId, reason: 'werewolves' });
        }
      }
    }
  }

  // Witch poison
  if (witchPoisonTarget) {
    deathsToProcess.push({ playerId: witchPoisonTarget, reason: 'witch' });
  }

  // Apply deaths
  deathsToProcess.forEach(({ playerId, reason }) => {
    const player = room.players.find((p) => p.id === playerId);
    if (player && player.isAlive) {
      player.isAlive = false;
      player.diedInPhase = 'night_end_summary';
      player.deathReason = reason;
      deathNames.push(player.name);

      room.logs.unshift({
        id: Math.random().toString(36).substring(7),
        timestamp: new Date().toLocaleTimeString(),
        phase: room.phase,
        dayNumber: room.dayNumber,
        message: `${player.name} (${ALL_ROLES[player.role]?.dutchName || player.role}) is vannacht om het leven gekomen (${reason === 'werewolves' ? 'verslonden door weerwolven' : 'vergiftigd'}).`,
        category: 'death',
      });

      // Lover chain reaction
      if (player.isLoverWith) {
        const lover = room.players.find((p) => p.id === player.isLoverWith);
        if (lover && lover.isAlive) {
          lover.isAlive = false;
          lover.diedInPhase = 'night_end_summary';
          lover.deathReason = 'lover_heartbreak';
          deathNames.push(`${lover.name} (van verdriet)`);
          room.logs.unshift({
            id: Math.random().toString(36).substring(7),
            timestamp: new Date().toLocaleTimeString(),
            phase: room.phase,
            dayNumber: room.dayNumber,
            message: `💔 ${lover.name} kon niet leven zonder geliefde ${player.name} en sterft van intens verdriet!`,
            category: 'love',
          });
        }
      }
    }
  });

  return deathNames;
}

// Setup WebSocket Server
const wss = new WebSocketServer({ noServer: true });

wss.on('connection', (ws: WebSocket) => {
  const meta: SocketMeta = { ws };
  clients.set(ws, meta);

  ws.on('message', (data: string) => {
    try {
      const action: WsClientAction = JSON.parse(data.toString());
      handleClientAction(ws, meta, action);
    } catch (e) {
      console.error('WS parse error', e);
    }
  });

  ws.on('close', () => {
    if (meta.roomCode && meta.playerId) {
      const room = rooms.get(meta.roomCode);
      if (room) {
        const p = room.players.find((pl) => pl.id === meta.playerId);
        if (p) p.isOnline = false;
        broadcastRoom(meta.roomCode);
      }
    }
    clients.delete(ws);
  });
});

function handleClientAction(ws: WebSocket, meta: SocketMeta, action: WsClientAction) {
  switch (action.type) {
    case 'CREATE_ROOM': {
      const { hostName, settings } = action.payload;
      const code = generateRoomCode();
      const hostId = 'p_' + Math.random().toString(36).substring(2, 9);
      const room = createInitialRoom(code, hostName || 'Spelleider', hostId);
      if (settings) {
        room.settings = { ...room.settings, ...settings };
      }
      rooms.set(code, room);
      meta.roomCode = code;
      meta.playerId = hostId;
      meta.isHost = true;

      broadcastRoom(code, 'gong');
      break;
    }

    case 'JOIN_ROOM': {
      const { roomCode, playerName, playerId } = action.payload;
      const cleanCode = roomCode.trim().toUpperCase();
      const room = rooms.get(cleanCode);

      if (!room) {
        ws.send(JSON.stringify({ type: 'ERROR', payload: { message: `Kamer met code "${cleanCode}" niet gevonden!` } }));
        return;
      }

      // Check if rejoining existing player
      let player = room.players.find((p) => p.id === playerId || (p.name.toLowerCase() === playerName.toLowerCase() && !p.isOnline));

      if (!player) {
        if (room.phase !== 'lobby') {
          ws.send(JSON.stringify({ type: 'ERROR', payload: { message: 'Het spel is al gestart in deze kamer!' } }));
          return;
        }

        const newId = 'p_' + Math.random().toString(36).substring(2, 9);
        player = {
          id: newId,
          name: playerName,
          role: 'burger',
          isAlive: true,
          isMayor: false,
          avatarColor: getRandomColor(),
          isOnline: true,
          lastSeen: Date.now(),
        };
        room.players.push(player);
        room.logs.unshift({
          id: Math.random().toString(36).substring(7),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          phase: room.phase,
          dayNumber: room.dayNumber,
          message: `${playerName} is het dorp binnengekomen.`,
          category: 'system',
        });
      } else {
        player.isOnline = true;
        player.lastSeen = Date.now();
      }

      meta.roomCode = cleanCode;
      meta.playerId = player.id;
      meta.isHost = room.hostId === player.id;

      broadcastRoom(cleanCode);
      break;
    }

    case 'UPDATE_DECK': {
      if (!meta.roomCode) return;
      const room = rooms.get(meta.roomCode);
      if (room) {
        room.selectedDeck = action.payload.deck;
        broadcastRoom(meta.roomCode);
      }
      break;
    }

    case 'UPDATE_SETTINGS': {
      if (!meta.roomCode) return;
      const room = rooms.get(meta.roomCode);
      if (room) {
        room.settings = { ...room.settings, ...action.payload.settings };
        broadcastRoom(meta.roomCode);
      }
      break;
    }

    case 'START_GAME': {
      if (!meta.roomCode) return;
      const room = rooms.get(meta.roomCode);
      if (!room || room.players.length < 3) {
        ws.send(JSON.stringify({ type: 'ERROR', payload: { message: 'Minimaal 3 spelers vereist om te starten!' } }));
        return;
      }

      // Deal roles randomly
      const deck = [...room.selectedDeck];
      while (deck.length < room.players.length) {
        deck.push('burger'); // pad with villagers if deck smaller than players
      }
      // Shuffle deck
      const shuffledDeck = deck.sort(() => Math.random() - 0.5);

      room.players.forEach((p, idx) => {
        p.role = shuffledDeck[idx] || 'burger';
        p.originalRole = p.role;
        p.isAlive = true;
        p.isProtected = false;
        p.isEnchanted = false;
        p.hasHealed = false;
        p.hasPoisoned = false;
        p.elderLives = p.role === 'dorpsoudste' ? 2 : undefined;
        p.diedInPhase = undefined;
        p.deathReason = undefined;
      });

      // Extra unassigned cards for Thief
      if (room.selectedDeck.includes('dief')) {
        const extra = shuffledDeck.slice(room.players.length, room.players.length + 2);
        room.nightDecisions.thiefExtraCards = extra.length >= 2 ? extra : ['burger', 'weerwolf'];
      }

      room.dayNumber = 1;
      room.phase = getNextNightPhase('lobby', room);
      room.winner = null;
      room.winReason = undefined;
      room.dayVotes = {};
      room.nightDecisions = {
        ...room.nightDecisions,
        werewolfVotes: {},
        werewolfChat: [],
      };

      room.logs.unshift({
        id: Math.random().toString(36).substring(7),
        timestamp: new Date().toLocaleTimeString(),
        phase: room.phase,
        dayNumber: 1,
        message: '🌑 De nacht valt over Wakkerdam... Iedereen sluit de ogen!',
        category: 'phase',
      });

      broadcastRoom(meta.roomCode, 'wolf_howl');
      break;
    }

    case 'NEXT_PHASE': {
      if (!meta.roomCode) return;
      const room = rooms.get(meta.roomCode);
      if (!room) return;

      if (action.payload?.targetPhase) {
        room.phase = action.payload.targetPhase;
      } else {
        // Automatic state progression
        if (room.phase.startsWith('night_') && room.phase !== 'night_end_summary') {
          room.phase = getNextNightPhase(room.phase, room);
        } else if (room.phase === 'night_end_summary') {
          // Resolve deaths
          resolveNightDeaths(room);
          const hasWon = checkWinCondition(room);
          if (!hasWon) {
            room.phase = 'day_discussion';
            room.phaseTimerRemaining = room.settings.discussionTimeSeconds;
            room.phaseTimerMax = room.settings.discussionTimeSeconds;
            room.timerActive = true;
            room.logs.unshift({
              id: Math.random().toString(36).substring(7),
              timestamp: new Date().toLocaleTimeString(),
              phase: 'day_discussion',
              dayNumber: room.dayNumber,
              message: `☀️ Dag ${room.dayNumber} breekt aan! Het dorp ontwaakt en de discussie begint.`,
              category: 'phase',
            });
            broadcastRoom(meta.roomCode, 'rooster');
            return;
          }
        } else if (room.phase === 'day_discussion') {
          room.phase = 'day_voting';
          room.dayVotes = {};
          room.logs.unshift({
            id: Math.random().toString(36).substring(7),
            timestamp: new Date().toLocaleTimeString(),
            phase: 'day_voting',
            dayNumber: room.dayNumber,
            message: '🗳️ De stemming is geopend! Wijs de schuldige aan.',
            category: 'vote',
          });
          broadcastRoom(meta.roomCode, 'bell');
          return;
        } else if (room.phase === 'day_voting') {
          // Count day votes
          const voteCounts: Record<string, number> = {};
          Object.entries(room.dayVotes).forEach(([voterId, targetId]) => {
            const voter = room.players.find((p) => p.id === voterId);
            const weight = voter?.isMayor ? 2 : 1;
            voteCounts[targetId] = (voteCounts[targetId] || 0) + weight;
          });

          // Find highest
          let maxVotes = 0;
          let executedId: string | null = null;
          let isTie = false;
          Object.entries(voteCounts).forEach(([targetId, count]) => {
            if (count > maxVotes) {
              maxVotes = count;
              executedId = targetId;
              isTie = false;
            } else if (count === maxVotes && maxVotes > 0) {
              isTie = true;
            }
          });

          if (executedId && !isTie) {
            const victim = room.players.find((p) => p.id === executedId);
            if (victim) {
              victim.isAlive = false;
              victim.diedInPhase = 'day_voting';
              victim.deathReason = 'vote';
              room.logs.unshift({
                id: Math.random().toString(36).substring(7),
                timestamp: new Date().toLocaleTimeString(),
                phase: 'day_voting',
                dayNumber: room.dayNumber,
                message: `⚖️ Het dorp heeft gesproken: ${victim.name} (${ALL_ROLES[victim.role]?.dutchName || victim.role}) wordt gelyncht!`,
                category: 'death',
              });

              // Check lover
              if (victim.isLoverWith) {
                const lover = room.players.find((p) => p.id === victim.isLoverWith);
                if (lover && lover.isAlive) {
                  lover.isAlive = false;
                  lover.diedInPhase = 'day_voting';
                  lover.deathReason = 'lover_heartbreak';
                  room.logs.unshift({
                    id: Math.random().toString(36).substring(7),
                    timestamp: new Date().toLocaleTimeString(),
                    phase: 'day_voting',
                    dayNumber: room.dayNumber,
                    message: `💔 ${lover.name} sterft ter plekke van intens hartzeer!`,
                    category: 'love',
                  });
                }
              }

              // Check Hunter revenge
              if (victim.role === 'jager') {
                room.phase = 'day_hunter_revenge';
                room.hunterPendingShooterId = victim.id;
                broadcastRoom(meta.roomCode, 'bell');
                return;
              }
            }
          } else {
            room.logs.unshift({
              id: Math.random().toString(36).substring(7),
              timestamp: new Date().toLocaleTimeString(),
              phase: 'day_voting',
              dayNumber: room.dayNumber,
              message: `⚖️ De stemming eindigt in gelijkspel of geen stemmen. Niemand wordt verbannen!`,
              category: 'vote',
            });
          }

          const hasWon = checkWinCondition(room);
          if (!hasWon) {
            // Start next night
            room.dayNumber += 1;
            room.nightDecisions = {
              werewolfVotes: {},
              werewolfChat: [],
            };
            room.phase = getNextNightPhase('lobby', room);
            room.logs.unshift({
              id: Math.random().toString(36).substring(7),
              timestamp: new Date().toLocaleTimeString(),
              phase: room.phase,
              dayNumber: room.dayNumber,
              message: `🌑 Nacht ${room.dayNumber} valt in... De dorpsbewoners sluiten hun ogen.`,
              category: 'phase',
            });
            broadcastRoom(meta.roomCode, 'wolf_howl');
            return;
          }
        }
      }

      broadcastRoom(meta.roomCode);
      break;
    }

    case 'SEER_PEEK': {
      if (!meta.roomCode) return;
      const room = rooms.get(meta.roomCode);
      if (!room) return;
      const target = room.players.find((p) => p.id === action.payload.targetId);
      if (target) {
        room.nightDecisions.seerCheckedTarget = target.id;
        room.nightDecisions.seerRevealedRole = target.role;

        ws.send(
          JSON.stringify({
            type: 'SEER_REVEAL',
            payload: {
              targetId: target.id,
              targetName: target.name,
              role: target.role,
            },
          })
        );
        broadcastRoom(meta.roomCode);
      }
      break;
    }

    case 'WOLF_VOTE': {
      if (!meta.roomCode || !meta.playerId) return;
      const room = rooms.get(meta.roomCode);
      if (!room) return;

      if (!room.nightDecisions.werewolfVotes) {
        room.nightDecisions.werewolfVotes = {};
      }
      room.nightDecisions.werewolfVotes[meta.playerId] = action.payload.targetId;

      // Find consensus
      const votes = Object.values(room.nightDecisions.werewolfVotes);
      const tally: Record<string, number> = {};
      votes.forEach((tid) => (tally[tid] = (tally[tid] || 0) + 1));

      let topTarget = '';
      let topCount = 0;
      Object.entries(tally).forEach(([tid, count]) => {
        if (count > topCount) {
          topCount = count;
          topTarget = tid;
        }
      });
      room.nightDecisions.werewolfTarget = topTarget;

      broadcastRoom(meta.roomCode);
      break;
    }

    case 'WOLF_MESSAGE': {
      if (!meta.roomCode || !meta.playerId) return;
      const room = rooms.get(meta.roomCode);
      if (!room) return;
      const sender = room.players.find((p) => p.id === meta.playerId);
      if (sender && sender.role === 'weerwolf') {
        if (!room.nightDecisions.werewolfChat) room.nightDecisions.werewolfChat = [];
        room.nightDecisions.werewolfChat.push({
          senderId: sender.id,
          senderName: sender.name,
          text: action.payload.text,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
        broadcastRoom(meta.roomCode);
      }
      break;
    }

    case 'WITCH_ACTION': {
      if (!meta.roomCode || !meta.playerId) return;
      const room = rooms.get(meta.roomCode);
      if (!room) return;
      const witch = room.players.find((p) => p.id === meta.playerId);
      if (!witch) return;

      if (action.payload.heal && !witch.hasHealed) {
        room.nightDecisions.witchHealTarget = room.nightDecisions.werewolfTarget;
        witch.hasHealed = true;
      }
      if (action.payload.poisonTargetId && !witch.hasPoisoned) {
        room.nightDecisions.witchPoisonTarget = action.payload.poisonTargetId;
        witch.hasPoisoned = true;
      }
      broadcastRoom(meta.roomCode, 'bubble');
      break;
    }

    case 'GUARD_PROTECT': {
      if (!meta.roomCode) return;
      const room = rooms.get(meta.roomCode);
      if (!room) return;
      room.nightDecisions.guardTarget = action.payload.targetId;
      broadcastRoom(meta.roomCode);
      break;
    }

    case 'CUPID_LINK': {
      if (!meta.roomCode) return;
      const room = rooms.get(meta.roomCode);
      if (!room) return;
      const { lover1Id, lover2Id } = action.payload;
      const p1 = room.players.find((p) => p.id === lover1Id);
      const p2 = room.players.find((p) => p.id === lover2Id);
      if (p1 && p2) {
        p1.isLoverWith = p2.id;
        p2.isLoverWith = p1.id;
        room.nightDecisions.cupidLovers = [p1.id, p2.id];
        room.logs.unshift({
          id: Math.random().toString(36).substring(7),
          timestamp: new Date().toLocaleTimeString(),
          phase: room.phase,
          dayNumber: room.dayNumber,
          message: `💘 Cupido heeft ${p1.name} en ${p2.name} voor eeuwig aan elkaar verbonden!`,
          category: 'love',
        });
        broadcastRoom(meta.roomCode);
      }
      break;
    }

    case 'THIEF_CHOOSE': {
      if (!meta.roomCode || !meta.playerId) return;
      const room = rooms.get(meta.roomCode);
      if (!room) return;
      const thief = room.players.find((p) => p.id === meta.playerId);
      if (thief) {
        thief.role = action.payload.chosenRole;
        room.nightDecisions.thiefChosenRole = action.payload.chosenRole;
        broadcastRoom(meta.roomCode);
      }
      break;
    }

    case 'FLUTE_ENCHANT': {
      if (!meta.roomCode) return;
      const room = rooms.get(meta.roomCode);
      if (!room) return;
      action.payload.targets.forEach((tid) => {
        const target = room.players.find((p) => p.id === tid);
        if (target) target.isEnchanted = true;
      });
      room.nightDecisions.fluteTargets = action.payload.targets;
      broadcastRoom(meta.roomCode);
      break;
    }

    case 'CAST_DAY_VOTE': {
      if (!meta.roomCode || !meta.playerId) return;
      const room = rooms.get(meta.roomCode);
      if (!room) return;
      room.dayVotes[meta.playerId] = action.payload.targetId;
      broadcastRoom(meta.roomCode);
      break;
    }

    case 'HUNTER_REVENGE': {
      if (!meta.roomCode) return;
      const room = rooms.get(meta.roomCode);
      if (!room) return;
      const target = room.players.find((p) => p.id === action.payload.targetId);
      if (target && target.isAlive) {
        target.isAlive = false;
        target.diedInPhase = 'day_hunter_revenge';
        target.deathReason = 'hunter';
        room.logs.unshift({
          id: Math.random().toString(36).substring(7),
          timestamp: new Date().toLocaleTimeString(),
          phase: 'day_hunter_revenge',
          dayNumber: room.dayNumber,
          message: `🏹 De Jager lost met zijn laatste adem een schot op ${target.name} (${ALL_ROLES[target.role]?.dutchName || target.role})!`,
          category: 'death',
        });

        // Check lover
        if (target.isLoverWith) {
          const lover = room.players.find((p) => p.id === target.isLoverWith);
          if (lover && lover.isAlive) {
            lover.isAlive = false;
            lover.diedInPhase = 'day_hunter_revenge';
            lover.deathReason = 'lover_heartbreak';
            room.logs.unshift({
              id: Math.random().toString(36).substring(7),
              timestamp: new Date().toLocaleTimeString(),
              phase: 'day_hunter_revenge',
              dayNumber: room.dayNumber,
              message: `💔 ${lover.name} sterft van intens verdriet na het verlies van ${target.name}!`,
              category: 'love',
            });
          }
        }

        room.hunterPendingShooterId = undefined;
        const hasWon = checkWinCondition(room);
        if (!hasWon) {
          // Continue to next night
          room.dayNumber += 1;
          room.phase = getNextNightPhase('lobby', room);
        }
        broadcastRoom(meta.roomCode, 'bell');
      }
      break;
    }

    case 'KILL_PLAYER': {
      if (!meta.roomCode) return;
      const room = rooms.get(meta.roomCode);
      if (!room) return;
      const p = room.players.find((pl) => pl.id === action.payload.playerId);
      if (p) {
        p.isAlive = false;
        p.deathReason = action.payload.reason || 'spelleider';
        room.logs.unshift({
          id: Math.random().toString(36).substring(7),
          timestamp: new Date().toLocaleTimeString(),
          phase: room.phase,
          dayNumber: room.dayNumber,
          message: `☠️ ${p.name} is geëlimineerd door de spelleider.`,
          category: 'death',
        });
        checkWinCondition(room);
        broadcastRoom(meta.roomCode, 'bell');
      }
      break;
    }

    case 'REVIVE_PLAYER': {
      if (!meta.roomCode) return;
      const room = rooms.get(meta.roomCode);
      if (!room) return;
      const p = room.players.find((pl) => pl.id === action.payload.playerId);
      if (p) {
        p.isAlive = true;
        p.diedInPhase = undefined;
        p.deathReason = undefined;
        room.logs.unshift({
          id: Math.random().toString(36).substring(7),
          timestamp: new Date().toLocaleTimeString(),
          phase: room.phase,
          dayNumber: room.dayNumber,
          message: `✨ ${p.name} is weer tot leven gewekt door de spelleider!`,
          category: 'action',
        });
        broadcastRoom(meta.roomCode);
      }
      break;
    }

    case 'SET_MAYOR': {
      if (!meta.roomCode) return;
      const room = rooms.get(meta.roomCode);
      if (!room) return;
      room.players.forEach((p) => (p.isMayor = p.id === action.payload.targetId));
      const target = room.players.find((p) => p.id === action.payload.targetId);
      if (target) {
        room.logs.unshift({
          id: Math.random().toString(36).substring(7),
          timestamp: new Date().toLocaleTimeString(),
          phase: room.phase,
          dayNumber: room.dayNumber,
          message: `👑 ${target.name} is gekozen tot de nieuwe Burgemeester van Wakkerdam!`,
          category: 'action',
        });
      }
      broadcastRoom(meta.roomCode);
      break;
    }

    case 'TIMER_CONTROL': {
      if (!meta.roomCode) return;
      const room = rooms.get(meta.roomCode);
      if (!room) return;
      if (action.payload.action === 'start') room.timerActive = true;
      if (action.payload.action === 'pause') room.timerActive = false;
      if (action.payload.action === 'reset') {
        room.phaseTimerRemaining = action.payload.seconds || room.phaseTimerMax;
      }
      if (action.payload.action === 'set' && action.payload.seconds) {
        room.phaseTimerRemaining = action.payload.seconds;
        room.phaseTimerMax = action.payload.seconds;
      }
      broadcastRoom(meta.roomCode);
      break;
    }

    case 'CHANGE_PLAYER_ROLE': {
      if (!meta.roomCode) return;
      const room = rooms.get(meta.roomCode);
      if (!room) return;
      const p = room.players.find((pl) => pl.id === action.payload.playerId);
      if (p) {
        p.role = action.payload.newRole;
        p.originalRole = action.payload.newRole;
        room.logs.unshift({
          id: Math.random().toString(36).substring(7),
          timestamp: new Date().toLocaleTimeString(),
          phase: room.phase,
          dayNumber: room.dayNumber,
          message: `🎭 Rol van ${p.name} is handmatig gewijzigd naar ${ALL_ROLES[action.payload.newRole]?.dutchName || action.payload.newRole}.`,
          category: 'system',
        });
        broadcastRoom(meta.roomCode);
      }
      break;
    }

    case 'START_NEXT_NIGHT': {
      if (!meta.roomCode) return;
      const room = rooms.get(meta.roomCode);
      if (!room) return;
      room.dayNumber = (room.dayNumber || 0) + 1;
      room.dayVotes = {};
      room.nightDecisions = {
        werewolfVotes: {},
        werewolfChat: [],
      };
      room.players.forEach((p) => {
        p.isProtected = false;
      });
      room.phase = getNextNightPhase('lobby', room);
      room.logs.unshift({
        id: Math.random().toString(36).substring(7),
        timestamp: new Date().toLocaleTimeString(),
        phase: room.phase,
        dayNumber: room.dayNumber,
        message: `🌑 Nacht ${room.dayNumber} valt in... De dorpsbewoners sluiten de ogen!`,
        category: 'phase',
      });
      broadcastRoom(meta.roomCode, 'wolf_howl');
      break;
    }

    case 'RESTART_SAME_PLAYERS': {
      if (!meta.roomCode) return;
      const room = rooms.get(meta.roomCode);
      if (!room) return;
      
      // Re-deal roles from selected deck
      const deck = [...room.selectedDeck];
      while (deck.length < room.players.length) {
        deck.push('burger');
      }
      const shuffledDeck = deck.sort(() => Math.random() - 0.5);

      room.players.forEach((p, idx) => {
        p.role = shuffledDeck[idx] || 'burger';
        p.originalRole = p.role;
        p.isAlive = true;
        p.isProtected = false;
        p.isEnchanted = false;
        p.isMayor = false;
        p.isLoverWith = undefined;
        p.hasHealed = false;
        p.hasPoisoned = false;
        p.elderLives = p.role === 'dorpsoudste' ? 2 : undefined;
        p.diedInPhase = undefined;
        p.deathReason = undefined;
      });

      if (room.selectedDeck.includes('dief')) {
        const extra = shuffledDeck.slice(room.players.length, room.players.length + 2);
        room.nightDecisions.thiefExtraCards = extra.length >= 2 ? extra : ['burger', 'weerwolf'];
      }

      room.dayNumber = 1;
      room.phase = getNextNightPhase('lobby', room);
      room.winner = null;
      room.winReason = undefined;
      room.dayVotes = {};
      room.nightDecisions = {
        werewolfVotes: {},
        werewolfChat: [],
      };

      room.logs.unshift({
        id: Math.random().toString(36).substring(7),
        timestamp: new Date().toLocaleTimeString(),
        phase: room.phase,
        dayNumber: 1,
        message: '🔄 Nieuwe ronde gestart met dezelfde spelers! Iedereen heeft een nieuwe geheime rol ontvangen.',
        category: 'phase',
      });

      broadcastRoom(meta.roomCode, 'wolf_howl');
      break;
    }

    case 'RESET_GAME': {
      if (!meta.roomCode) return;
      const room = rooms.get(meta.roomCode);
      if (!room) return;
      room.phase = 'lobby';
      room.dayNumber = 0;
      room.winner = null;
      room.winReason = undefined;
      room.dayVotes = {};
      room.nightDecisions = {};
      room.players.forEach((p) => {
        p.isAlive = true;
        p.isMayor = false;
        p.isProtected = false;
        p.isEnchanted = false;
        p.isLoverWith = undefined;
        p.hasHealed = false;
        p.hasPoisoned = false;
      });
      room.logs.unshift({
        id: Math.random().toString(36).substring(7),
        timestamp: new Date().toLocaleTimeString(),
        phase: 'lobby',
        dayNumber: 0,
        message: '🔄 Spel gereset naar de lobby.',
        category: 'system',
      });
      broadcastRoom(meta.roomCode);
      break;
    }

    case 'EXECUTE_SQL': {
      // Interactive Real-time SQL Query Engine
      const start = Date.now();
      const result = executeInteractiveSql(action.payload.query, meta.roomCode);
      const executionTimeMs = Date.now() - start;

      ws.send(
        JSON.stringify({
          type: 'SQL_RESULT',
          payload: {
            query: action.payload.query,
            rows: result.rows,
            columns: result.columns,
            rowCount: result.rows.length,
            executionTimeMs,
            error: result.error,
          },
        })
      );
      if (result.mutated && meta.roomCode) {
        broadcastRoom(meta.roomCode);
      }
      break;
    }
  }
}

// Interactive SQL Executor for realtime query/inspection
function executeInteractiveSql(query: string, currentRoomCode?: string): { rows: any[]; columns: string[]; error?: string; mutated?: boolean } {
  try {
    const trimmed = query.trim().replace(/;$/, '');
    const upper = trimmed.toUpperCase();

    // 1. SELECT * FROM players
    if (upper.startsWith('SELECT') && upper.includes('FROM PLAYERS')) {
      const allPlayers: any[] = [];
      rooms.forEach((room, code) => {
        room.players.forEach((p) => {
          allPlayers.push({
            id: p.id,
            room_code: code,
            name: p.name,
            role: p.role,
            is_alive: p.isAlive,
            is_mayor: p.isMayor,
            is_lover_with: p.isLoverWith || null,
            is_protected: p.isProtected || false,
            is_enchanted: p.isEnchanted || false,
            death_reason: p.deathReason || null,
            is_online: p.isOnline || false,
          });
        });
      });

      let filtered = allPlayers;
      if (currentRoomCode && !upper.includes('ALL')) {
        filtered = filtered.filter((r) => r.room_code === currentRoomCode);
      }
      if (upper.includes('WHERE IS_ALIVE = TRUE')) {
        filtered = filtered.filter((r) => r.is_alive === true);
      }
      if (upper.includes("WHERE ROLE = 'WEERWOLF'")) {
        filtered = filtered.filter((r) => r.role === 'weerwolf');
      }

      const columns = ['id', 'room_code', 'name', 'role', 'is_alive', 'is_mayor', 'is_lover_with', 'is_protected', 'is_enchanted', 'death_reason'];
      return { rows: filtered, columns };
    }

    // 2. SELECT * FROM rooms
    if (upper.startsWith('SELECT') && upper.includes('FROM ROOMS')) {
      const rows: any[] = [];
      rooms.forEach((room, code) => {
        rows.push({
          code,
          phase: room.phase,
          day_number: room.dayNumber,
          player_count: room.players.length,
          alive_count: room.players.filter((p) => p.isAlive).length,
          winner: room.winner || 'in_progress',
          created_at: new Date(room.createdAt).toISOString(),
        });
      });
      const columns = ['code', 'phase', 'day_number', 'player_count', 'alive_count', 'winner', 'created_at'];
      return { rows, columns };
    }

    // 3. SELECT * FROM game_logs
    if (upper.startsWith('SELECT') && upper.includes('FROM GAME_LOGS')) {
      const rows: any[] = [];
      rooms.forEach((room, code) => {
        if (!currentRoomCode || code === currentRoomCode) {
          room.logs.forEach((log) => {
            rows.push({
              id: log.id,
              room_code: code,
              timestamp: log.timestamp,
              phase: log.phase,
              day_number: log.dayNumber,
              message: log.message,
              category: log.category,
            });
          });
        }
      });
      const columns = ['id', 'room_code', 'timestamp', 'phase', 'day_number', 'category', 'message'];
      return { rows, columns };
    }

    // 4. SELECT * FROM night_actions
    if (upper.startsWith('SELECT') && upper.includes('FROM NIGHT_ACTIONS')) {
      const rows: any[] = [];
      rooms.forEach((room, code) => {
        if (!currentRoomCode || code === currentRoomCode) {
          rows.push({
            room_code: code,
            werewolf_target: room.nightDecisions.werewolfTarget || null,
            seer_target: room.nightDecisions.seerCheckedTarget || null,
            seer_role: room.nightDecisions.seerRevealedRole || null,
            guard_target: room.nightDecisions.guardTarget || null,
            witch_heal: room.nightDecisions.witchHealTarget || null,
            witch_poison: room.nightDecisions.witchPoisonTarget || null,
          });
        }
      });
      const columns = ['room_code', 'werewolf_target', 'seer_target', 'seer_role', 'guard_target', 'witch_heal', 'witch_poison'];
      return { rows, columns };
    }

    // 5. UPDATE players SET ...
    if (upper.startsWith('UPDATE PLAYERS')) {
      let mutated = false;
      const matchKill = trimmed.match(/SET IS_ALIVE\s*=\s*(false|0)/i);
      const matchRevive = trimmed.match(/SET IS_ALIVE\s*=\s*(true|1)/i);
      const matchRole = trimmed.match(/SET ROLE\s*=\s*['"](.+?)['"]/i);
      const matchName = trimmed.match(/WHERE NAME\s*=\s*['"](.+?)['"]/i);

      if (currentRoomCode) {
        const room = rooms.get(currentRoomCode);
        if (room) {
          if (matchName) {
            const target = room.players.find((p) => p.name.toLowerCase() === matchName[1].toLowerCase());
            if (target) {
              if (matchKill) {
                target.isAlive = false;
                target.deathReason = 'spelleider';
                mutated = true;
                return {
                  rows: [{ affected_rows: 1, message: `Player ${target.name} marked as dead via SQL.` }],
                  columns: ['affected_rows', 'message'],
                  mutated: true,
                };
              }
              if (matchRevive) {
                target.isAlive = true;
                target.diedInPhase = undefined;
                target.deathReason = undefined;
                mutated = true;
                return {
                  rows: [{ affected_rows: 1, message: `Player ${target.name} revived via SQL.` }],
                  columns: ['affected_rows', 'message'],
                  mutated: true,
                };
              }
              if (matchRole) {
                target.role = matchRole[1] as RoleId;
                mutated = true;
                return {
                  rows: [{ affected_rows: 1, message: `Player ${target.name} role changed to ${matchRole[1]} via SQL.` }],
                  columns: ['affected_rows', 'message'],
                  mutated: true,
                };
              }
            }
          }
        }
      }
    }

    // Fallback: Default system schema view
    return {
      rows: [
        { table_name: 'players', description: 'Active player profiles, secret roles, and alive state' },
        { table_name: 'rooms', description: 'Active game rooms, current phases, and day counters' },
        { table_name: 'game_logs', description: 'Real-time action timeline and event logs' },
        { table_name: 'night_actions', description: 'Night targets (seer peek, werewolf pack vote, witch potions)' },
      ],
      columns: ['table_name', 'description'],
    };
  } catch (err: any) {
    return { rows: [], columns: [], error: err.message || 'SQL execution error' };
  }
}

// REST API endpoints
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', activeRooms: rooms.size, timestamp: Date.now() });
});

app.get('/api/room/:code', (req: Request, res: Response) => {
  const room = rooms.get(req.params.code.toUpperCase());
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  return res.json({
    roomCode: room.roomCode,
    phase: room.phase,
    dayNumber: room.dayNumber,
    playerCount: room.players.length,
    deck: room.selectedDeck,
  });
});

app.post('/api/sql-realtime', (req: Request, res: Response) => {
  const { query, roomCode } = req.body;
  const start = Date.now();
  const result = executeInteractiveSql(query || 'SELECT * FROM players', roomCode);
  res.json({
    query,
    ...result,
    executionTimeMs: Date.now() - start,
  });
});

// Upgrade handling for WebSockets
server.on('upgrade', (request, socket, head) => {
  const url = request.url || '';
  // Ignore Vite HMR websocket upgrades
  if (url.startsWith('/@vite') || url.includes('vite-hmr') || url.includes('vite')) {
    return;
  }
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

// Full-stack Vite development middleware
async function setupVite() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }
}

setupVite().then(() => {
  const portNumber = Number(PORT) || 3000;
  server.listen(portNumber, '0.0.0.0', () => {
    console.log(`🐺 Weerwolven server running on http://0.0.0.0:${portNumber}`);
  });
});
