import { NextRequest, NextResponse } from 'next/server';
import { getGame } from '@/lib/storage';

export async function POST(request: NextRequest) {
    try {
        const { gameToken, playerId } = await request.json();

        if (!gameToken || !playerId) {
            return NextResponse.json({
                valid: false,
                error: 'Missing gameToken or playerId'
            });
        }

        const game = await getGame(gameToken.toUpperCase());

        if (!game) {
            return NextResponse.json({
                valid: false,
                error: 'Game not found'
            });
        }

        // Find the player in the game
        const player = game.players.find(p => p.id === playerId);

        if (!player) {
            return NextResponse.json({
                valid: false,
                error: 'Player not found in game'
            });
        }

        // Session is valid
        return NextResponse.json({
            valid: true,
            gameToken: gameToken.toUpperCase(),
            gameStatus: game.gameStatus,
            playerName: player.name,
            isHost: player.isHost,
            currentRound: game.currentRound,
            maxRounds: game.maxRounds,
            playerCount: game.players.length
        });
    } catch (error) {
        console.error('Error validating session:', error);
        return NextResponse.json({
            valid: false,
            error: 'Failed to validate session'
        });
    }
}
