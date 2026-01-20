import { NextRequest, NextResponse } from 'next/server';
import { getGame, updateGame } from '@/lib/storage';
import { calculateRoundScores, resetCharacters } from '@/lib/gameLogic';
import { RoundResult } from '@/types/game';
import { broadcastGameUpdate } from '@/lib/pusher';

export async function POST(request: NextRequest) {
  try {
    const { gameToken, playerId, guessedPlayerId } = await request.json();

    if (!gameToken || !playerId || !guessedPlayerId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
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

    // Check if player is Mantri
    const player = game.players.find(p => p.id === playerId);
    if (player?.character !== 'MANTRI') {
      return NextResponse.json(
        { error: 'Only Mantri can make a guess' },
        { status: 403 }
      );
    }

    // Calculate scores
    const { updatedPlayers, isCorrect } = calculateRoundScores(game.players, guessedPlayerId);

    // Create map of old scores BEFORE updating
    const oldScores = new Map(game.players.map(p => [p.id, p.score]));

    // Save round result
    const chor = game.players.find(p => p.character === 'CHOR');
    const roundResult: RoundResult = {
      round: game.currentRound,
      players: updatedPlayers.map(p => ({
        id: p.id,
        name: p.name,
        character: p.character!,
        pointsEarned: p.score - (oldScores.get(p.id) || 0)  // Use old scores from before update
      })),
      mantriGuessedCorrectly: isCorrect,
      chorId: chor!.id,
      mantriGuessedId: guessedPlayerId
    };

    game.roundHistory.push(roundResult);
    game.players = updatedPlayers;

    // Always show ROUND_END first, even for last round
    // Frontend will auto-transition to GAME_END if it's the final round
    game.gameStatus = 'ROUND_END';

    await updateGame(gameToken.toUpperCase(), game);

    // Broadcast guess result to all players
    await broadcastGameUpdate(gameToken.toUpperCase(), game);

    return NextResponse.json({
      success: true,
      isCorrect,
      gameState: game
    });
  } catch (error) {
    console.error('Error processing guess:', error);
    return NextResponse.json(
      { error: 'Failed to process guess' },
      { status: 500 }
    );
  }
}
