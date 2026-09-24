import { useState, useEffect, useCallback, useRef } from 'react';
import { GameRoomState, WsClientAction, WsServerMessage, RoleId } from '../types/game';
import { sounds } from '../utils/sound';

export function useWerewolfSocket() {
  const [roomState, setRoomState] = useState<GameRoomState | null>(null);
  const [myPlayerId, setMyPlayerId] = useState<string>('');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [seerPeekResult, setSeerPeekResult] = useState<{ targetId: string; targetName: string; role: RoleId } | null>(null);
  const [sqlResult, setSqlResult] = useState<any | null>(null);
  const [isServerUnreachable, setIsServerUnreachable] = useState<boolean>(false);

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<any>(null);
  const retryCountRef = useRef<number>(0);
  const MAX_RETRIES = 3;

  const connect = useCallback(() => {
    if (
      socketRef.current?.readyState === WebSocket.OPEN ||
      socketRef.current?.readyState === WebSocket.CONNECTING
    ) {
      return;
    }

    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    const searchParams = new URLSearchParams(window.location.search);
    const customServerParam = searchParams.get('server');

    const isGitHub = window.location.hostname.endsWith('github.io');
    const backendHost = customServerParam || (isGitHub 
      ? 'ais-pre-y6e6de6rmualeckslw6ovv-766620080537.europe-west2.run.app' 
      : window.location.host);
    
    const protocol = (window.location.protocol === 'https:' || isGitHub || customServerParam?.startsWith('https')) ? 'wss:' : 'ws:';
    const cleanHost = backendHost.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const wsUrl = `${protocol}//${cleanHost}/ws`;

    try {
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setIsServerUnreachable(false);
        setErrorMessage(null);
        retryCountRef.current = 0; // Reset retries on successful connection

        // Auto rejoin saved room if any
        const savedRoom = localStorage.getItem('ww_room_code');
        const savedId = localStorage.getItem('ww_player_id');
        const savedName = localStorage.getItem('ww_player_name');
        if (savedRoom && savedName) {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(
              JSON.stringify({
                type: 'JOIN_ROOM',
                payload: { roomCode: savedRoom, playerName: savedName, playerId: savedId || undefined },
              })
            );
          }
        }
      };

      ws.onmessage = (event) => {
        try {
          const msg: WsServerMessage = JSON.parse(event.data);
          if (msg.type === 'ROOM_STATE') {
            setRoomState(msg.payload.state);
            setMyPlayerId(msg.payload.yourPlayerId);
            if (msg.payload.state.roomCode) {
              localStorage.setItem('ww_room_code', msg.payload.state.roomCode);
            }
            if (msg.payload.yourPlayerId) {
              localStorage.setItem('ww_player_id', msg.payload.yourPlayerId);
            }
          } else if (msg.type === 'ERROR') {
            setErrorMessage(msg.payload.message);
          } else if (msg.type === 'SEER_REVEAL') {
            setSeerPeekResult(msg.payload);
          } else if (msg.type === 'SOUND_EVENT') {
            switch (msg.payload.sound) {
              case 'wolf_howl':
                sounds.playWolfHowl();
                break;
              case 'gong':
                sounds.playMidnightGong();
                break;
              case 'bubble':
                sounds.playPotionBubble();
                break;
              case 'rooster':
                sounds.playDawnAwakening();
                break;
              case 'bell':
                sounds.playMidnightGong();
                break;
              case 'heartbeat':
                sounds.playHeartbeat();
                break;
              case 'victory':
                sounds.playVictory();
                break;
            }
          } else if (msg.type === 'SQL_RESULT') {
            setSqlResult(msg.payload);
          }
        } catch (e) {
          console.warn('WS message parse error', e);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        socketRef.current = null;

        if (retryCountRef.current < MAX_RETRIES) {
          const delay = Math.min(3000 * Math.pow(2, retryCountRef.current), 15000);
          retryCountRef.current += 1;
          
          if (!reconnectTimerRef.current) {
            reconnectTimerRef.current = setTimeout(() => {
              reconnectTimerRef.current = null;
              connect();
            }, delay);
          }
        } else {
          setIsServerUnreachable(true);
        }
      };

      ws.onerror = () => {
        setIsConnected(false);
      };
    } catch (e) {
      console.warn('Socket connection attempt exception', e);
      setIsConnected(false);
      setIsServerUnreachable(true);
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (socketRef.current) socketRef.current.close();
    };
  }, [connect]);

  const sendAction = useCallback((action: WsClientAction) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(action));
    } else {
      console.warn('Socket not open');
    }
  }, []);

  const createRoom = useCallback(
    (hostName: string) => {
      localStorage.setItem('ww_player_name', hostName);
      sendAction({ type: 'CREATE_ROOM', payload: { hostName } });
    },
    [sendAction]
  );

  const joinRoom = useCallback(
    (roomCode: string, playerName: string) => {
      localStorage.setItem('ww_room_code', roomCode.toUpperCase());
      localStorage.setItem('ww_player_name', playerName);
      sendAction({
        type: 'JOIN_ROOM',
        payload: { roomCode: roomCode.toUpperCase(), playerName },
      });
    },
    [sendAction]
  );

  const leaveRoom = useCallback(() => {
    localStorage.removeItem('ww_room_code');
    localStorage.removeItem('ww_player_id');
    setRoomState(null);
    setMyPlayerId('');
    window.location.reload();
  }, []);

  const reconnect = useCallback(() => {
    retryCountRef.current = 0;
    setIsServerUnreachable(false);
    connect();
  }, [connect]);

  return {
    roomState,
    myPlayerId,
    isConnected,
    isServerUnreachable,
    reconnect,
    errorMessage,
    setErrorMessage,
    seerPeekResult,
    setSeerPeekResult,
    sqlResult,
    sendAction,
    createRoom,
    joinRoom,
    leaveRoom,
  };
}
