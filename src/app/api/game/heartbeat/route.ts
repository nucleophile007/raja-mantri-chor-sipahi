import { NextRequest, NextResponse } from 'next/server';
import { getGame, updateGame } from '@/lib/storage';

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
      // Game doesn't exist - likely deleted. This is normal, silently fail.
      return NextResponse.json({
        success: false,
        gameDeleted: true
      });
    }

    // Find and update player's lastSeen
    const playerIndex = game.players.findIndex(p => p.id === playerId);
    
    if (playerIndex === -1) {
      // Player not in game - likely left or was removed. Silently fail.
      return NextResponse.json({
        success: false,
        playerRemoved: true
      });
    }

    game.players[playerIndex].lastSeen = Date.now();
    game.players[playerIndex].isActive = true;

    await updateGame(gameToken.toUpperCase(), game);

    return NextResponse.json({
      success: true
    });
  } catch (error) {
    console.error('Error updating heartbeat:', error);
    return NextResponse.json(
      { error: 'Failed to update heartbeat' },
      { status: 500 }
    );
  }
}
