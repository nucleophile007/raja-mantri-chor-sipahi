import { NextRequest, NextResponse } from 'next/server';
import { getGame, updateGame } from '@/lib/storage';
import { broadcastGameUpdate } from '@/lib/pusher';

export async function POST(request: NextRequest) {
  try {
    const { gameToken, playerId } = await request.json();

    if (!gameToken || !playerId) {
      return NextResponse.json(
        { error: 'Game token and player ID are required' },
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

    // Find the player
    const playerIndex = game.players.findIndex(p => p.id === playerId);
    
    if (playerIndex === -1) {
      return NextResponse.json(
        { error: 'Player not found in this game' },
        { status: 404 }
      );
    }

    // Reactivate the player
    game.players[playerIndex].isActive = true;
    game.players[playerIndex].lastSeen = Date.now();

    await updateGame(gameToken.toUpperCase(), game);

    // Broadcast update
    await broadcastGameUpdate(gameToken.toUpperCase(), game);

    return NextResponse.json({
      success: true,
      gameState: game,
      message: 'Successfully reconnected to game'
    });
  } catch (error) {
    console.error('Error reconnecting to game:', error);
    return NextResponse.json(
      { error: 'Failed to reconnect' },
      { status: 500 }
    );
  }
}
