import { NextRequest, NextResponse } from 'next/server';
import { getGame, updateGame } from '@/lib/storage';
import { shuffleAndAssignCharacters } from '@/lib/gameLogic';
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
        { error: 'Only host can distribute characters' },
        { status: 403 }
      );
    }

    if (game.players.length !== 4) {
      return NextResponse.json(
        { error: 'Need exactly 4 players to start' },
        { status: 400 }
      );
    }

    // Shuffle and assign characters
    const playersWithCharacters = shuffleAndAssignCharacters(game.players);
    
    game.players = playersWithCharacters;
    game.currentRound += 1;
    game.gameStatus = 'DISTRIBUTING';

    await updateGame(gameToken.toUpperCase(), game);

    // Broadcast initial distribution
    await broadcastGameUpdate(gameToken.toUpperCase(), game);

    // Automatically move to KING_REVEALED after animation completes (2.5 seconds)
    setTimeout(async () => {
      const updatedGame = await getGame(gameToken.toUpperCase());
      if (updatedGame) {
        updatedGame.gameStatus = 'KING_REVEALED';
        await updateGame(gameToken.toUpperCase(), updatedGame);
        // Broadcast status change
        await broadcastGameUpdate(gameToken.toUpperCase(), updatedGame);
      }
    }, 2500); // Match the frontend animation duration

    return NextResponse.json({
      success: true,
      gameState: game
    });
  } catch (error) {
    console.error('Error distributing characters:', error);
    return NextResponse.json(
      { error: 'Failed to distribute characters' },
      { status: 500 }
    );
  }
}
