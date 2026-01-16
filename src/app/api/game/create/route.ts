import { NextRequest, NextResponse } from 'next/server';
import { generateGameToken } from '@/lib/gameLogic';
import { createGame } from '@/lib/storage';
import { Player } from '@/types/game';

export async function POST(request: NextRequest) {
  try {
    const { playerName, maxRounds = 5 } = await request.json();
    
    if (!playerName || playerName.trim().length === 0) {
      return NextResponse.json(
        { error: 'Player name is required' },
        { status: 400 }
      );
    }

    // Validate maxRounds
    const rounds = parseInt(maxRounds);
    if (isNaN(rounds) || rounds < 1 || rounds > 30) {
      return NextResponse.json(
        { error: 'Number of rounds must be between 1 and 30' },
        { status: 400 }
      );
    }

    const gameToken = generateGameToken();
    
    const hostPlayer: Player = {
      id: crypto.randomUUID(),
      name: playerName.trim(),
      character: null,
      score: 0,
      isHost: true
    };

    const gameState = await createGame(gameToken, hostPlayer, rounds);

    return NextResponse.json({
      success: true,
      gameToken,
      playerId: hostPlayer.id,
      gameState
    });
  } catch (error) {
    console.error('Error creating game:', error);
    return NextResponse.json(
      { error: 'Failed to create game' },
      { status: 500 }
    );
  }
}
