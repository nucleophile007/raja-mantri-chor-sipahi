import { NextRequest, NextResponse } from 'next/server';
import { getImposterGame, updateImposterGame } from '@/lib/imposterStorage';
import { calculateVotingResult } from '@/lib/imposterLogic';
import { broadcastImposterAction } from '@/lib/pusher';

export async function POST(request: NextRequest) {
    try {
        const { gameToken, playerId } = await request.json();

        if (!gameToken || !playerId) {
            return NextResponse.json(
                { error: 'Game token and player ID are required' },
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

        // Only check timeout if game is in VOTING status
        if (game.gameStatus !== 'VOTING') {
            return NextResponse.json({
                success: true,
                message: 'Game is not in voting phase',
                timedOut: false
            });
        }

        // Check if voting has timed out
        if (!game.votingStartedAt) {
            return NextResponse.json(
                { error: 'Voting start time not set' },
                { status: 400 }
            );
        }

        const elapsed = Math.floor((Date.now() - game.votingStartedAt) / 1000);
        const timeout = game.votingTimeout || 120;

        // If time hasn't expired yet, do nothing
        if (elapsed < timeout) {
            return NextResponse.json({
                success: true,
                message: 'Voting still in progress',
                timedOut: false,
                remaining: timeout - elapsed
            });
        }

        // TIME IS UP - Auto-complete voting
        console.log(`⏰ Voting timeout reached for game ${gameToken}. Auto-completing...`);

        // Mark all players who haven't voted as having voted (these votes simply won't count)
        game.players = game.players.map(p => ({
            ...p,
            hasVoted: true  // Mark as voted so game can progress
        }));

        // Calculate result with current votes (non-voters won't have votes)
        const { mostVotedId, isCorrect } = calculateVotingResult(game);

        game.gameStatus = 'RESULT';
        game.result = isCorrect ? 'PLAYERS_WIN' : 'IMPOSTER_WINS';
        game.endedAt = Date.now();

        let endReason: string;
        if (!isCorrect && mostVotedId === '') {
            endReason = 'Votes were tied - Imposter wins!';
        } else if (!isCorrect) {
            const wrongTarget = game.players.find(p => p.id === mostVotedId);
            endReason = `${wrongTarget?.name} was not the imposter!`;
        } else {
            const imposter = game.players.find(p => p.id === game.imposterId);
            endReason = `${imposter?.name} was the imposter!`;
        }
        game.endReason = endReason;

        await updateImposterGame(gameToken, game);

        // Build vote results for broadcast
        const activePlayers = game.players.filter(p => p.isActive);
        const voteCount: Record<string, number> = {};
        game.votes.forEach(v => {
            voteCount[v.votedForId] = (voteCount[v.votedForId] || 0) + 1;
        });

        const voteResults = activePlayers
            .map(p => ({
                playerName: p.name,
                voteCount: voteCount[p.id] || 0,
                isImposter: p.id === game.imposterId
            }))
            .sort((a, b) => b.voteCount - a.voteCount);

        // Broadcast game ended action
        await broadcastImposterAction(gameToken, {
            type: 'GAME_ENDED',
            result: game.result,
            imposterName: game.players.find(p => p.id === game.imposterId)?.name || 'Unknown',
            endReason,
            voteResults
        });

        console.log(`✅ Voting auto-completed for game ${gameToken}. Result: ${game.result}`);

        return NextResponse.json({
            success: true,
            timedOut: true,
            message: 'Voting time expired - results calculated',
            result: game.result
        });
    } catch (error) {
        console.error('Error checking voting timeout:', error);
        return NextResponse.json(
            { error: 'Failed to check timeout' },
            { status: 500 }
        );
    }
}
