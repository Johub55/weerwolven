import { GameRoomState, Player, RoleId } from '../types/game';

export interface SqlExecutionResult {
  rows: any[];
  columns: string[];
  rowCount: number;
  executionTimeMs: number;
  error?: string;
  updatedRoomState?: GameRoomState;
}

export function executeLocalSql(
  query: string,
  currentRoomState: GameRoomState | null
): SqlExecutionResult {
  const start = performance.now();
  const trimmed = query.trim().replace(/;$/, '');
  const upper = trimmed.toUpperCase();

  // Create or copy players state
  const roomCode = currentRoomState?.roomCode || 'LOKAAL_DEMO';
  const players: Player[] = currentRoomState?.players
    ? JSON.parse(JSON.stringify(currentRoomState.players))
    : [
        { id: 'p1', name: 'Lisa', role: 'zienster', isAlive: true, isMayor: true, isHost: true, avatarColor: '#f59e0b', isOnline: true },
        { id: 'p2', name: 'Peter', role: 'weerwolf', isAlive: true, isMayor: false, avatarColor: '#ef4444', isOnline: true },
        { id: 'p3', name: 'Anna', role: 'burger', isAlive: true, isMayor: false, avatarColor: '#10b981', isOnline: true },
        { id: 'p4', name: 'Bram', role: 'heks', isAlive: true, isMayor: false, avatarColor: '#6366f1', isOnline: true },
        { id: 'p5', name: 'Sanne', role: 'witte_weerwolf', isAlive: false, isMayor: false, avatarColor: '#ec4899', deathReason: 'weerwolf', isOnline: false },
      ];

  try {
    // 1. SELECT ... FROM PLAYERS
    if (upper.startsWith('SELECT') && upper.includes('FROM PLAYERS')) {
      let filtered = players.map((p) => ({
        id: p.id,
        room_code: roomCode,
        name: p.name,
        role: p.role,
        is_alive: p.isAlive,
        is_mayor: p.isMayor,
        is_lover_with: p.isLoverWith || null,
        is_protected: p.isProtected || false,
        is_enchanted: p.isEnchanted || false,
        death_reason: p.deathReason || null,
        is_online: p.isOnline || false,
      }));

      if (upper.includes('WHERE IS_ALIVE = TRUE')) {
        filtered = filtered.filter((r) => r.is_alive === true);
      } else if (upper.includes('WHERE IS_ALIVE = FALSE')) {
        filtered = filtered.filter((r) => r.is_alive === false);
      }

      if (upper.includes("ROLE IN ('WEERWOLF', 'WITTE_WEERWOLF', 'BABBELZIEKE_WEERWOLF', 'GROTE_BOZE_WOLF')")) {
        filtered = filtered.filter((r) =>
          ['weerwolf', 'witte_weerwolf', 'babbelzieke_weerwolf', 'grote_boze_wolf'].includes(r.role)
        );
      } else if (upper.includes("ROLE IN ('WILDE_KIND', 'DORPSGEK')")) {
        filtered = filtered.filter((r) => ['wilde_kind', 'dorpsgek'].includes(r.role));
      } else if (upper.includes("WHERE ROLE = 'WEERWOLF'")) {
        filtered = filtered.filter((r) => r.role === 'weerwolf');
      }

      const columns = ['id', 'room_code', 'name', 'role', 'is_alive', 'is_mayor', 'is_lover_with', 'is_protected', 'is_enchanted', 'death_reason'];
      return {
        rows: filtered,
        columns,
        rowCount: filtered.length,
        executionTimeMs: Math.round(performance.now() - start) || 1,
      };
    }

    // 2. SELECT ... FROM ROOMS
    if (upper.startsWith('SELECT') && upper.includes('FROM ROOMS')) {
      const rows = [
        {
          code: roomCode,
          phase: currentRoomState?.phase || 'lobby',
          day_number: currentRoomState?.dayNumber || 0,
          player_count: players.length,
          alive_count: players.filter((p) => p.isAlive).length,
          winner: currentRoomState?.winner || 'in_progress',
          created_at: new Date(currentRoomState?.createdAt || Date.now()).toISOString(),
        },
      ];
      const columns = ['code', 'phase', 'day_number', 'player_count', 'alive_count', 'winner', 'created_at'];
      return {
        rows,
        columns,
        rowCount: rows.length,
        executionTimeMs: Math.round(performance.now() - start) || 1,
      };
    }

    // 3. SELECT ... FROM GAME_LOGS
    if (upper.startsWith('SELECT') && upper.includes('FROM GAME_LOGS')) {
      const logs = currentRoomState?.logs || [
        {
          id: 'log1',
          timestamp: new Date().toLocaleTimeString(),
          phase: 'lobby',
          dayNumber: 0,
          message: 'Kamer gestart in SQL engine.',
          category: 'system',
        },
      ];
      const rows = logs.map((l) => ({
        id: l.id,
        room_code: roomCode,
        timestamp: l.timestamp,
        phase: l.phase,
        day_number: l.dayNumber,
        category: l.category,
        message: l.message,
      }));
      const columns = ['id', 'room_code', 'timestamp', 'phase', 'day_number', 'category', 'message'];
      return {
        rows,
        columns,
        rowCount: rows.length,
        executionTimeMs: Math.round(performance.now() - start) || 1,
      };
    }

    // 4. SELECT ... FROM NIGHT_ACTIONS
    if (upper.startsWith('SELECT') && upper.includes('FROM NIGHT_ACTIONS')) {
      const nd = currentRoomState?.nightDecisions || {};
      const rows = [
        {
          room_code: roomCode,
          werewolf_target: nd.werewolfTarget || null,
          seer_target: nd.seerCheckedTarget || null,
          seer_role: nd.seerRevealedRole || null,
          guard_target: nd.guardTarget || null,
          witch_heal: nd.witchHealTarget || null,
          witch_poison: nd.witchPoisonTarget || null,
        },
      ];
      const columns = ['room_code', 'werewolf_target', 'seer_target', 'seer_role', 'guard_target', 'witch_heal', 'witch_poison'];
      return {
        rows,
        columns,
        rowCount: rows.length,
        executionTimeMs: Math.round(performance.now() - start) || 1,
      };
    }

    // 5. UPDATE PLAYERS
    if (upper.startsWith('UPDATE PLAYERS')) {
      const matchKill = trimmed.match(/SET IS_ALIVE\s*=\s*(false|0)/i);
      const matchRevive = trimmed.match(/SET IS_ALIVE\s*=\s*(true|1)/i);
      const matchMayor = trimmed.match(/SET IS_MAYOR\s*=\s*(true|1)/i);
      const matchUnMayor = trimmed.match(/SET IS_MAYOR\s*=\s*(false|0)/i);
      const matchRole = trimmed.match(/SET ROLE\s*=\s*['"](.+?)['"]/i);
      const matchName = trimmed.match(/WHERE NAME\s*=\s*['"](.+?)['"]/i);

      if (matchName) {
        const target = players.find((p) => p.name.toLowerCase() === matchName[1].toLowerCase());
        if (target) {
          let msgText = '';
          if (matchKill) {
            target.isAlive = false;
            target.deathReason = 'spelleider';
            msgText = `Speler ${target.name} gedood via SQL query.`;
          } else if (matchRevive) {
            target.isAlive = true;
            target.deathReason = undefined;
            msgText = `Speler ${target.name} tot leven gewekt via SQL query.`;
          } else if (matchMayor) {
            players.forEach((p) => (p.isMayor = false));
            target.isMayor = true;
            msgText = `Speler ${target.name} gemaakt tot Burgemeester via SQL query.`;
          } else if (matchUnMayor) {
            target.isMayor = false;
            msgText = `Burgemeesterschap verwijderd van ${target.name} via SQL query.`;
          } else if (matchRole) {
            const newRole = matchRole[1] as RoleId;
            
            // Role limits
            const ROLE_LIMITS: Partial<Record<RoleId, number>> = {
              zienster: 1,
              heks: 1,
              beschermer: 1,
              cupido: 1,
              dief: 1,
              dorpsoudste: 1,
              meisje: 1,
              fluitspeler: 1,
              witte_weerwolf: 1,
              wilde_kind: 1,
              zondebok: 1,
              dorpsgek: 1,
              weerwolf: 3,
            };
            
            const limit = ROLE_LIMITS[newRole];
            if (limit !== undefined) {
              const count = players.filter(p => p.role === newRole).length;
              if (count >= limit) {
                return {
                  rows: [],
                  columns: ['error'],
                  rowCount: 0,
                  executionTimeMs: Math.round(performance.now() - start) || 1,
                  error: `Limiet bereikt voor rol '${newRole}' (max ${limit}).`,
                };
              }
            }

            target.role = newRole;
            msgText = `Rol van ${target.name} gewijzigd naar '${newRole}' via SQL query.`;
          } else {
            msgText = `Speler ${target.name} gewijzigd via SQL query.`;
          }

          let updatedRoomState: GameRoomState | undefined = undefined;
          if (currentRoomState) {
            updatedRoomState = {
              ...currentRoomState,
              players,
              logs: [
                {
                  id: Math.random().toString(36).substring(7),
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                  phase: currentRoomState.phase,
                  dayNumber: currentRoomState.dayNumber,
                  message: `⚡ [SQL Engine]: ${msgText}`,
                  category: 'system',
                },
                ...currentRoomState.logs,
              ],
            };
          }

          return {
            rows: [{ affected_rows: 1, message: msgText }],
            columns: ['affected_rows', 'message'],
            rowCount: 1,
            executionTimeMs: Math.round(performance.now() - start) || 1,
            updatedRoomState,
          };
        } else {
          return {
            rows: [],
            columns: ['error'],
            rowCount: 0,
            executionTimeMs: Math.round(performance.now() - start) || 1,
            error: `Speler met naam '${matchName[1]}' niet gevonden in de SQL speltabel.`,
          };
        }
      }
    }

    // Default table schema listing fallback
    const defaultSchema = [
      { table_name: 'players', description: 'Actieve spelerprofielen, geheime rollen en levend status' },
      { table_name: 'rooms', description: 'Actieve spelkamers, fases en dagtellers' },
      { table_name: 'game_logs', description: 'Realtime actietijdlijn en gebeurtenissenlogboek' },
      { table_name: 'night_actions', description: 'Nachtelijke besluiten (zienster, weerwolven, heks)' },
    ];

    return {
      rows: defaultSchema,
      columns: ['table_name', 'description'],
      rowCount: defaultSchema.length,
      executionTimeMs: Math.round(performance.now() - start) || 1,
    };
  } catch (err: any) {
    return {
      rows: [],
      columns: [],
      rowCount: 0,
      executionTimeMs: Math.round(performance.now() - start) || 1,
      error: err.message || 'Fout bij het uitvoeren van de SQL query.',
    };
  }
}
