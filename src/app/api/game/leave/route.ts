import { NextRequest, NextResponse } from 'next/server';
import { getGame, updateGame, deleteGame } from '@/lib/storage';
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

    const leavingPlayer = game.players[playerIndex];

    // If host is leaving, always delete the game
    if (leavingPlayer.isHost) {
      await deleteGame(gameToken.toUpperCase());
      
      // Broadcast game deletion to all players
      await broadcastGameUpdate(gameToken.toUpperCase(), {
        ...game,
        gameStatus: 'GAME_END' as const,
        players: [] // Clear players to signal game deletion
      });

      return NextResponse.json({
        success: true,
        gameDeleted: true,
        message: 'Game has been ended by host'
      });
    }

    // If game has started (currentRound > 0), terminate the entire game
    // This prevents score inconsistencies
    if (game.currentRound > 0) {
      await deleteGame(gameToken.toUpperCase());
      
      // Broadcast game deletion to all players
      await broadcastGameUpdate(gameToken.toUpperCase(), {
        ...game,
        gameStatus: 'GAME_END' as const,
        players: [] // Clear players to signal game deletion
      });

      return NextResponse.json({
        success: true,
        gameDeleted: true,
        message: 'Game has been ended because a player left mid-game'
      });
    }

    // Game hasn't started yet (still in lobby), so just remove the player
    game.players.splice(playerIndex, 1);

    // If no players left after removal, delete the game
    if (game.players.length === 0) {
      await deleteGame(gameToken.toUpperCase());
      return NextResponse.json({
        success: true,
        gameDeleted: true,
        message: 'Game deleted - no players remaining'
      });
    }

    // Update the game with the removed player
    await updateGame(gameToken.toUpperCase(), game);

    // Broadcast update to remaining players
    await broadcastGameUpdate(gameToken.toUpperCase(), game);

    return NextResponse.json({
      success: true,
      gameDeleted: false,
      message: 'Successfully left the game'
    });
  } catch (error) {
    console.error('Error leaving game:', error);
    return NextResponse.json(
      { error: 'Failed to leave game' },
      { status: 500 }
    );
  }
}
