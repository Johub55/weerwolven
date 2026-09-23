import React, { useState, useEffect } from 'react';
import { Database, Play, RefreshCw, Terminal, CheckCircle2, AlertCircle, Sparkles, X, Edit3 } from 'lucide-react';
import { GameRoomState } from '../types/game';

interface RealtimeSqlInspectorProps {
  isOpen: boolean;
  onClose: () => void;
  roomState: GameRoomState | null;
  onExecuteSql: (query: string) => void;
  sqlResult: any | null;
}

export const RealtimeSqlInspector: React.FC<RealtimeSqlInspectorProps> = ({
  isOpen,
  onClose,
  roomState,
  onExecuteSql,
  sqlResult,
}) => {
  const [query, setQuery] = useState<string>('SELECT * FROM players;');
  const [activeTab, setActiveTab] = useState<'editor' | 'tables' | 'logs'>('editor');
  const [executing, setExecuting] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && !sqlResult) {
      onExecuteSql('SELECT * FROM players;');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRun = () => {
    setExecuting(true);
    onExecuteSql(query);
    setTimeout(() => setExecuting(false), 300);
  };

  const templates = [
    { label: 'Alle Spelers & Rollen', sql: 'SELECT id, name, role, is_mayor, is_alive FROM players;' },
    { label: 'Alleen Levende Spelers', sql: 'SELECT id, name, role, is_mayor FROM players WHERE is_alive = true;' },
    { label: 'Weerwolven Roedel', sql: "SELECT * FROM players WHERE role IN ('weerwolf', 'witte_weerwolf', 'babbelzieke_weerwolf', 'grote_boze_wolf');" },
    { label: 'Maak Burgemeester (SQL)', sql: "UPDATE players SET is_mayor = true WHERE name = 'Lisa';" },
    { label: 'Vind Wilde Kind / Idioot', sql: "SELECT * FROM players WHERE role IN ('wilde_kind', 'dorpsgek');" },
    { label: 'Nachtbesluiten (Live)', sql: 'SELECT * FROM night_actions;' },
    { label: 'Recente Spellogboek', sql: 'SELECT * FROM game_logs;' },
    { label: 'Actieve Kamers & Status', sql: 'SELECT * FROM rooms;' },
    { label: 'Vermoord Speler via SQL', sql: "UPDATE players SET is_alive = false WHERE name = 'Peter';" },
    { label: 'Wek Speler tot Leven (SQL)', sql: "UPDATE players SET is_alive = true WHERE name = 'Peter';" },
    { label: 'Wijzig Rol naar Witte Weerwolf', sql: "UPDATE players SET role = 'witte_weerwolf' WHERE name = 'Lisa';" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[92vh] bg-slate-950 border-2 border-amber-500/50 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 animate-pulse">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-cinzel font-bold text-white tracking-wide">
                  Live Realtime SQL Engine & Database Inspector
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  LIVE SYNC
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Direct queryen en bewerken van de live speltabellen en realtime WebSockets data
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-2 px-6 py-2 bg-slate-900/60 border-b border-slate-800/80 overflow-x-auto text-xs">
          <button
            onClick={() => setActiveTab('editor')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium transition ${
              activeTab === 'editor'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            SQL Query Editor
          </button>
          <button
            onClick={() => {
              setActiveTab('tables');
              onExecuteSql('SELECT * FROM players;');
            }}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium transition ${
              activeTab === 'tables'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            Tabel: players
          </button>
          <button
            onClick={() => {
              setActiveTab('logs');
              onExecuteSql('SELECT * FROM game_logs;');
            }}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium transition ${
              activeTab === 'logs'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            Tabel: game_logs
          </button>
        </div>

        {/* Query Area */}
        <div className="p-4 sm:p-6 flex-1 overflow-y-auto space-y-4">
          {/* Quick templates */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider shrink-0 mr-1">
              Snelle SQL Templates:
            </span>
            {templates.map((tpl, i) => (
              <button
                key={i}
                onClick={() => {
                  setQuery(tpl.sql);
                  onExecuteSql(tpl.sql);
                }}
                className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-300 border border-slate-700 text-[11px] shrink-0 transition"
              >
                {tpl.label}
              </button>
            ))}
          </div>

          {/* SQL Input Box */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 overflow-hidden shadow-inner">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-950/80 border-b border-slate-800 text-xs text-slate-400">
              <span className="font-mono flex items-center gap-1.5 text-amber-400">
                <Terminal className="w-3.5 h-3.5" /> live_realtime_db &gt; SQL
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRun}
                  disabled={executing}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 text-xs shadow-lg transition active:scale-95 disabled:opacity-50"
                >
                  <Play className="w-3 h-3 fill-white" />
                  <span>Voer SQL Uit (Execute)</span>
                </button>
              </div>
            </div>
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              rows={3}
              placeholder="Typ hier je SQL query (bijv. SELECT * FROM players WHERE is_alive = true;)"
              className="w-full p-3 font-mono text-sm bg-transparent text-emerald-300 focus:outline-none focus:ring-1 focus:ring-amber-500/50 resize-none"
            />
          </div>

          {/* Result Output Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white">Uitvoer Resultaat:</span>
                {sqlResult?.rowCount !== undefined && (
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                    {sqlResult.rowCount} rijen ({sqlResult.executionTimeMs || 1}ms)
                  </span>
                )}
              </div>
              {sqlResult?.error ? (
                <span className="text-red-400 flex items-center gap-1 font-mono">
                  <AlertCircle className="w-3 h-3" /> {sqlResult.error}
                </span>
              ) : (
                <span className="text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Query succesvol verwerkt
                </span>
              )}
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-x-auto max-h-[36vh] shadow-inner">
              {sqlResult?.rows && sqlResult.rows.length > 0 ? (
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-950 sticky top-0 border-b border-slate-800 text-slate-400">
                    <tr>
                      {sqlResult.columns?.map((col: string) => (
                        <th key={col} className="px-3 py-2.5 uppercase font-bold text-amber-300/90 whitespace-nowrap">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {sqlResult.rows.map((row: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-800/40 transition">
                        {sqlResult.columns?.map((col: string) => (
                          <td key={col} className="px-3 py-2 whitespace-nowrap">
                            {typeof row[col] === 'boolean' ? (
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  row[col] ? 'bg-emerald-950 text-emerald-400' : 'bg-red-950 text-red-400'
                                }`}
                              >
                                {String(row[col])}
                              </span>
                            ) : row[col] === null ? (
                              <span className="text-slate-600 italic">null</span>
                            ) : (
                              String(row[col])
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-8 text-center text-slate-500 text-xs">
                  Geen rijen geretourneerd of voer een SQL query uit hierboven.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>
            ⚡ SQL engine gesynchroniseerd met de actieve spelkamer{' '}
            <strong className="text-amber-400 font-mono">{roomState?.roomCode || 'LOKAAL'}</strong>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition"
          >
            Sluiten
          </button>
        </div>
      </div>
    </div>
  );
};
