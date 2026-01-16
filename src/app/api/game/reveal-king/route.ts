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

    // Check if player is host
    const player = game.players.find(p => p.id === playerId);
    if (!player?.isHost) {
      return NextResponse.json(
        { error: 'Only host can reveal king' },
        { status: 403 }
      );
    }

    // Only transition if currently DISTRIBUTING
    if (game.gameStatus !== 'DISTRIBUTING') {
      return NextResponse.json({
        success: true,
        gameState: game
      });
    }

    // Update status to KING_REVEALED
    game.gameStatus = 'KING_REVEALED';
    await updateGame(gameToken.toUpperCase(), game);

    // Broadcast the update
    await broadcastGameUpdate(gameToken.toUpperCase(), game);

    return NextResponse.json({
      success: true,
      gameState: game
    });
  } catch (error) {
    console.error('Error revealing king:', error);
    return NextResponse.json(
      { error: 'Failed to reveal king' },
      { status: 500 }
    );
  }
}
