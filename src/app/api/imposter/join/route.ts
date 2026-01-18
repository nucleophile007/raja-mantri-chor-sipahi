import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { ImposterPlayer } from '@/types/imposter';
import { getImposterGame, updateImposterGame } from '@/lib/imposterStorage';
import { MAX_PLAYERS } from '@/lib/imposterLogic';
import { broadcastImposterAction } from '@/lib/pusher';

export async function POST(request: NextRequest) {
    try {
        const { gameToken, playerName } = await request.json();

        if (!gameToken || !playerName) {
            return NextResponse.json(
                { error: 'Game token and player name are required' },
                { status: 400 }
            );
        }

        if (playerName.length > 20) {
            return NextResponse.json(
                { error: 'Player name must be 20 characters or less' },
                { status: 400 }
            );
        }

        const game = await getImposterGame(gameToken);

        if (!game) {
            return NextResponse.json(
                { error: 'Game not found' },
                { status: 404 }
            );
        }

        if (game.gameStatus !== 'WAITING') {
            return NextResponse.json(
                { error: 'Game has already started' },
                { status: 400 }
            );
        }

        const activePlayers = game.players.filter(p => p.isActive);
        if (activePlayers.length >= MAX_PLAYERS) {
            return NextResponse.json(
                { error: `Game is full (max ${MAX_PLAYERS} players)` },
                { status: 400 }
            );
        }

        // Check for duplicate names
        const nameExists = game.players.some(
            p => p.isActive && p.name.toLowerCase() === playerName.trim().toLowerCase()
        );
        if (nameExists) {
            return NextResponse.json(
                { error: 'A player with this name already exists' },
                { status: 400 }
            );
        }

        const playerId = uuidv4();

        const newPlayer: ImposterPlayer = {
            id: playerId,
            name: playerName.trim(),
            isHost: false,
            isActive: true,
            hasScratched: false,
            hasVoted: false,
            isInLobby: true,
            joinedAt: Date.now()
        };

        game.players.push(newPlayer);
        await updateImposterGame(gameToken, game);

        // Broadcast action for instant UI update
        await broadcastImposterAction(gameToken, {
            type: 'PLAYER_JOINED',
            playerName: newPlayer.name,
            isHost: false
        });

        return NextResponse.json({
            success: true,
            gameToken: game.gameToken,
            playerId,
            playerName: newPlayer.name
        });
    } catch (error) {
        console.error('Error joining Imposter game:', error);
        return NextResponse.json(
            { error: 'Failed to join game' },
            { status: 500 }
        );
    }
}
