import { NextRequest, NextResponse } from 'next/server';
import { getGame, updateGame } from '@/lib/storage';
import { resetCharacters } from '@/lib/gameLogic';
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
        { error: 'Only host can start next round' },
        { status: 403 }
      );
    }

    // Check if game should end
    if (game.currentRound >= game.maxRounds) {
      game.gameStatus = 'GAME_END';
      await updateGame(gameToken.toUpperCase(), game);
      // Broadcast game end
      await broadcastGameUpdate(gameToken.toUpperCase(), game);
      return NextResponse.json({
        success: true,
        gameState: game,
        gameEnded: true
      });
    }

    // Reset characters for next round
    game.players = resetCharacters(game.players);
    game.gameStatus = 'WAITING';

    await updateGame(gameToken.toUpperCase(), game);

    // Broadcast next round start
    await broadcastGameUpdate(gameToken.toUpperCase(), game);

    return NextResponse.json({
      success: true,
      gameState: game,
      gameEnded: false
    });
  } catch (error) {
    console.error('Error starting next round:', error);
    return NextResponse.json(
      { error: 'Failed to start next round' },
      { status: 500 }
    );
  }
}
