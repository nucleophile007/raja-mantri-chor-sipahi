import { NextRequest, NextResponse } from 'next/server';
import { getGame, addPlayerToGame } from '@/lib/storage';
import { Player } from '@/types/game';
import { broadcastGameUpdate } from '@/lib/pusher';

export async function POST(request: NextRequest) {
  try {
    const { gameToken, playerName } = await request.json();
    
    if (!gameToken || !playerName || playerName.trim().length === 0) {
      return NextResponse.json(
        { error: 'Game token and player name are required' },
        { status: 400 }
      );
    }

    const game = await getGame(gameToken.toUpperCase());
    
    if (!game) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }

    if (game.players.length >= 4) {
      return NextResponse.json(
        { error: 'Game is full' },
        { status: 400 }
      );
    }

    if (game.gameStatus !== 'WAITING') {
      return NextResponse.json(
        { error: 'Game has already started' },
        { status: 400 }
      );
    }

    const newPlayer: Player = {
      id: crypto.randomUUID(),
      name: playerName.trim(),
      character: null,
      score: 0,
      isHost: false,
      isActive: true,
      lastSeen: Date.now()
    };

    const updatedGame = await addPlayerToGame(gameToken.toUpperCase(), newPlayer);

    if (!updatedGame) {
      return NextResponse.json(
        { error: 'Failed to update game' },
        { status: 500 }
      );
    }

    // 🎉 Broadcast update to all players via Pusher
    await broadcastGameUpdate(gameToken.toUpperCase(), updatedGame);

    return NextResponse.json({
      success: true,
      playerId: newPlayer.id,
      gameState: updatedGame
    });
  } catch (error) {
    console.error('Error joining game:', error);
    return NextResponse.json(
      { error: 'Failed to join game' },
      { status: 500 }
    );
  }
}
