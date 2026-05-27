import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  createGame,
  discardToCrib,
  playCard as enginePlayCard,
  declareGo as engineDeclareGo,
  advanceRound,
  type GameState,
  type PlayerId,
} from '../engine';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface UseSupabaseGame {
  state: GameState;
  roomCode: string | null;
  isHost: boolean;
  playersInRoom: string[];
  isConnected: boolean;

  // Room management
  createRoom: (playerName: string) => Promise<string>;
  joinRoom: (code: string, playerName: string) => Promise<void>;
  leaveRoom: () => void;

  // Game actions (broadcast to everyone)
  discard: (indices: number[]) => void;
  playCard: (index: number) => void;
  sayGo: () => void;
  advanceToNextRound: () => void;
}

// Generate a short, readable room code
function generateRoomCode(length = 5): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function useSupabaseGame(): UseSupabaseGame {
  const [state, setState] = useState<GameState>(() =>
    createGame({ playerCount: 2, seed: Date.now() })
  );
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [playersInRoom, setPlayersInRoom] = useState<string[]>([]);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const currentPlayerId: PlayerId = 'p1'; // In online mode we treat local user as p1

  // Apply an action to local state (used for both local actions and incoming broadcasts)
  const applyAction = useCallback((action: any) => {
    setState(prev => {
      switch (action.type) {
        case 'discard':
          return discardToCrib(prev, action.player, action.indices);
        case 'playCard':
          return enginePlayCard(prev, action.player, action.index);
        case 'sayGo':
          return engineDeclareGo(prev, action.player);
        case 'advanceRound':
          return advanceRound(prev);
        case 'fullState':
          return action.state;
        default:
          return prev;
      }
    });
  }, []);

  // Broadcast an action to the room
  const broadcastAction = useCallback((action: any) => {
    if (channel) {
      channel.send({
        type: 'broadcast',
        event: 'game_action',
        payload: action,
      });
    }
  }, [channel]);

  // Create a new room
  const createRoom = useCallback(async (playerName: string): Promise<string> => {
    const code = generateRoomCode();
    const channelName = `game:${code}`;

    const newChannel = supabase.channel(channelName, {
      config: { presence: { key: playerName } },
    });

    // Set up listeners
    newChannel
      .on('broadcast', { event: 'game_action' }, ({ payload }) => {
        applyAction(payload);
      })
      .on('presence', { event: 'sync' }, () => {
        const presenceState = newChannel.presenceState();
        const names = Object.values(presenceState).flat().map((p: any) => p.name);
        setPlayersInRoom(names);
      });

    await newChannel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await newChannel.track({ name: playerName, joinedAt: new Date().toISOString() });
      }
    });

    // Initialize game state
    const initialGame = createGame({ playerCount: 2, seed: Date.now() });

    setRoomCode(code);
    setIsHost(true);
    setChannel(newChannel);
    setState(initialGame);
    setIsConnected(true);

    // Broadcast initial state so late joiners can catch up (basic version)
    newChannel.send({
      type: 'broadcast',
      event: 'game_action',
      payload: { type: 'fullState', state: initialGame },
    });

    return code;
  }, [applyAction]);

  // Join an existing room
  const joinRoom = useCallback(async (code: string, playerName: string) => {
    const channelName = `game:${code.toUpperCase()}`;

    const newChannel = supabase.channel(channelName, {
      config: { presence: { key: playerName } },
    });

    newChannel
      .on('broadcast', { event: 'game_action' }, ({ payload }) => {
        applyAction(payload);
      })
      .on('presence', { event: 'sync' }, () => {
        const presenceState = newChannel.presenceState();
        const names = Object.values(presenceState).flat().map((p: any) => p.name);
        setPlayersInRoom(names);
      });

    await newChannel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await newChannel.track({ name: playerName, joinedAt: new Date().toISOString() });
      }
    });

    setRoomCode(code.toUpperCase());
    setIsHost(false);
    setChannel(newChannel);
    setIsConnected(true);
  }, [applyAction]);

  const leaveRoom = useCallback(() => {
    if (channel) {
      channel.unsubscribe();
    }
    setChannel(null);
    setRoomCode(null);
    setIsHost(false);
    setPlayersInRoom([]);
    setIsConnected(false);

    // Reset to a fresh local game
    setState(createGame({ playerCount: 2, seed: Date.now() }));
  }, [channel]);

  // Game actions — broadcast to room
  const discard = useCallback((indices: number[]) => {
    const action = { type: 'discard', player: currentPlayerId, indices };
    applyAction(action);
    broadcastAction(action);
  }, [applyAction, broadcastAction]);

  const play = useCallback((index: number) => {
    const action = { type: 'playCard', player: currentPlayerId, index };
    applyAction(action);
    broadcastAction(action);
  }, [applyAction, broadcastAction]);

  const sayGo = useCallback(() => {
    const action = { type: 'sayGo', player: currentPlayerId };
    applyAction(action);
    broadcastAction(action);
  }, [applyAction, broadcastAction]);

  const advanceToNextRound = useCallback(() => {
    const action = { type: 'advanceRound' };
    applyAction(action);
    broadcastAction(action);
  }, [applyAction, broadcastAction]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (channel) channel.unsubscribe();
    };
  }, [channel]);

  return {
    state,
    roomCode,
    isHost,
    playersInRoom,
    isConnected,
    createRoom,
    joinRoom,
    leaveRoom,
    discard,
    playCard: play,
    sayGo,
    advanceToNextRound,
  };
}
