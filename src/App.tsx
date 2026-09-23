import React, { useState } from 'react';
import { useWerewolfSocket } from './hooks/useWerewolfSocket';
import { Navbar } from './components/Navbar';
import { LobbyView } from './components/LobbyView';
import { PlayerMobileView } from './components/PlayerMobileView';
import { SpelleiderDashboard } from './components/SpelleiderDashboard';
import { LocalGameMasterView } from './components/LocalGameMasterView';
import { RoleDirectoryModal } from './components/RoleDirectoryModal';
import { RealtimeSqlInspector } from './components/RealtimeSqlInspector';
import { AlertCircle, X, Shield, Smartphone } from 'lucide-react';

export default function App() {
  const {
    roomState,
    myPlayerId,
    isConnected,
    errorMessage,
    setErrorMessage,
    seerPeekResult,
    sqlResult,
    sendAction,
    createRoom,
    joinRoom,
    leaveRoom,
  } = useWerewolfSocket();

  const [activeMode, setActiveMode] = useState<'online' | 'local'>('online');
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isSqlOpen, setIsSqlOpen] = useState(false);
  const [hostPlayerCardToggle, setHostPlayerCardToggle] = useState(false);

  const isHost = roomState ? roomState.hostId === myPlayerId : false;
  const inLobby = !roomState || roomState.phase === 'lobby';

  const handleExecuteSql = (query: string) => {
    sendAction({
      type: 'EXECUTE_SQL',
      payload: { query },
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-amber-500 selection:text-slate-950">
      {/* Top Navbar with Realtime SQL inspector button and mode tabs */}
      <Navbar
        roomState={roomState}
        isConnected={isConnected}
        onOpenRules={() => setIsRulesOpen(true)}
        onOpenSql={() => setIsSqlOpen(true)}
        activeMode={activeMode}
        onSwitchMode={(mode) => setActiveMode(mode)}
        onLeaveRoom={leaveRoom}
      />

      {/* Error Toast notification */}
      {errorMessage && (
        <div className="max-w-md mx-auto mt-4 px-4">
          <div className="p-3.5 rounded-2xl bg-red-950 border border-red-500/50 text-red-200 text-xs flex items-center justify-between shadow-xl animate-shake">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="p-1 rounded-full text-red-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main View Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-2 sm:p-4">
        {activeMode === 'local' ? (
          <LocalGameMasterView />
        ) : inLobby ? (
          <LobbyView
            roomState={roomState}
            myPlayerId={myPlayerId}
            onCreateRoom={createRoom}
            onJoinRoom={joinRoom}
            onUpdateDeck={(deck) => sendAction({ type: 'UPDATE_DECK', payload: { deck } })}
            onUpdateSettings={(settings) => sendAction({ type: 'UPDATE_SETTINGS', payload: { settings } })}
            onStartGame={() => sendAction({ type: 'START_GAME', payload: {} })}
          />
        ) : isHost ? (
          <div className="space-y-4">
            {/* Host Toggle: Master Dashboard vs Own Mobile Secret Card */}
            <div className="flex items-center justify-between p-2 rounded-2xl bg-slate-900 border border-slate-800 max-w-sm mx-auto text-xs">
              <button
                onClick={() => setHostPlayerCardToggle(false)}
                className={`flex-1 py-1.5 rounded-xl font-bold transition flex items-center justify-center gap-1.5 ${
                  !hostPlayerCardToggle ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                Spelleider Scherm
              </button>
              <button
                onClick={() => setHostPlayerCardToggle(true)}
                className={`flex-1 py-1.5 rounded-xl font-bold transition flex items-center justify-center gap-1.5 ${
                  hostPlayerCardToggle ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                Mijn Geheime Kaart
              </button>
            </div>

            {hostPlayerCardToggle ? (
              <PlayerMobileView
                roomState={roomState}
                myPlayerId={myPlayerId}
                seerPeekResult={seerPeekResult}
                onSendAction={sendAction}
              />
            ) : (
              <SpelleiderDashboard
                roomState={roomState}
                myPlayerId={myPlayerId}
                onSendAction={sendAction}
              />
            )}
          </div>
        ) : (
          <PlayerMobileView
            roomState={roomState}
            myPlayerId={myPlayerId}
            seerPeekResult={seerPeekResult}
            onSendAction={sendAction}
          />
        )}
      </main>

      {/* Role Encyclopedia & Rules Modal */}
      <RoleDirectoryModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />

      {/* Live Realtime SQL Inspector Modal */}
      <RealtimeSqlInspector
        isOpen={isSqlOpen}
        onClose={() => setIsSqlOpen(false)}
        roomState={roomState}
        onExecuteSql={handleExecuteSql}
        sqlResult={sqlResult}
      />
    </div>
  );
}
