import { NextRequest, NextResponse } from 'next/server';
import { getImposterGame, updateImposterGame } from '@/lib/imposterStorage';
import { allPlayersVoted, calculateVotingResult } from '@/lib/imposterLogic';
import { broadcastImposterAction } from '@/lib/pusher';

export async function POST(request: NextRequest) {
    try {
        const { gameToken, playerId, votedForName } = await request.json();

        if (!gameToken || !playerId || !votedForName) {
            return NextResponse.json(
                { error: 'Game token, player ID, and vote target name are required' },
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

        const player = game.players.find(p => p.id === playerId);
        if (!player || !player.isActive) {
            return NextResponse.json(
                { error: 'Player not found or not active' },
                { status: 404 }
            );
        }

        if (game.gameStatus !== 'VOTING') {
            return NextResponse.json(
                { error: 'Voting is not active' },
                { status: 400 }
            );
        }

        if (player.hasVoted) {
            return NextResponse.json(
                { error: 'You have already voted' },
                { status: 400 }
            );
        }

        // Find target by name (not by ID passed from client)
        const target = game.players.find(p => p.name === votedForName && p.isActive);
        if (!target) {
            return NextResponse.json(
                { error: 'Invalid vote target' },
                { status: 400 }
            );
        }

        // Can't vote for yourself
        if (target.id === playerId) {
            return NextResponse.json(
                { error: 'You cannot vote for yourself' },
                { status: 400 }
            );
        }

        // Record vote (using actual ID internally, but never exposed to client)
        game.votes.push({
            voterId: playerId,
            votedForId: target.id,
            timestamp: Date.now()
        });

        // Mark player as voted
        game.players = game.players.map(p =>
            p.id === playerId ? { ...p, hasVoted: true } : p
        );

        // Calculate counts for instant UI
        const activePlayers = game.players.filter(p => p.isActive);
        const votedCount = activePlayers.filter(p => p.hasVoted).length;

        // Broadcast vote action for instant UI update
        await broadcastImposterAction(gameToken, {
            type: 'PLAYER_VOTED',
            voterName: player.name,
            votedCount,
            totalActive: activePlayers.length
        });

        // Milestone: First player voted!
        if (votedCount === 1) {
            await broadcastImposterAction(gameToken, {
                type: 'MILESTONE',
                message: `[FIRST VOTE] ${player.name} VOTED!`
            });
        }

        // Check if all voted
        if (allPlayersVoted(game.players)) {
            // Milestone: All players voted!
            await broadcastImposterAction(gameToken, {
                type: 'MILESTONE',
                message: '[ALL VOTES IN] REVEALING RESULTS...'
            });

            // Calculate result
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

            // Force refresh to ensure all clients see result screen
            setTimeout(async () => {
                await broadcastImposterAction(gameToken, {
                    type: 'WORD_READY' // Reuse as generic refresh trigger
                });
            }, 500);
        } else {
            await updateImposterGame(gameToken, game);
        }

        return NextResponse.json({
            success: true,
            gameStatus: game.gameStatus
        });
    } catch (error) {
        console.error('Error processing vote:', error);
        return NextResponse.json(
            { error: 'Failed to process vote' },
            { status: 500 }
        );
    }
}
