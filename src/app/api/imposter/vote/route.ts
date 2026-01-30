import { NextRequest, NextResponse } from 'next/server';
import { withGameLock } from '@/lib/imposterStorage';
import { allPlayersVoted, calculateVotingResult } from '@/lib/imposterLogic';
import { broadcastImposterAction } from '@/lib/pusher';
import { ImposterPlayer, ImposterGame } from '@/types/imposter';

interface VoteResult {
    alreadyVoted: boolean;
    game: ImposterGame;
    player: ImposterPlayer;
    allVoted?: boolean;
    gameEnded?: boolean;
    endDetails?: {
        mostVotedId: string;
        isCorrect: boolean;
        endReason: string;
    } | null;
}

export async function POST(request: NextRequest) {
    try {
        const { gameToken, playerId, votedForName } = await request.json();

        if (!gameToken || !playerId || !votedForName) {
            return NextResponse.json({ error: 'Game token, player ID, and vote target are required' }, { status: 400 });
        }

        const result = await withGameLock<VoteResult>(gameToken, async (game) => {
            const player = game.players.find(p => p.id === playerId);
            if (!player || !player.isActive) throw new Error('Player not found or not active');

            if (game.gameStatus !== 'VOTING') throw new Error('Voting is not active');
            if (player.hasVoted) return { game, result: { alreadyVoted: true, game, player } };

            const target = game.players.find(p => p.name === votedForName && p.isActive);
            if (!target) throw new Error('Invalid vote target');
            if (target.id === playerId) throw new Error('You cannot vote for yourself');

            // Record vote
            game.votes.push({
                voterId: playerId,
                votedForId: target.id,
                timestamp: Date.now()
            });

            // Mark player
            game.players = game.players.map(p =>
                p.id === playerId ? { ...p, hasVoted: true } : p
            );

            // Check completion
            let gameEnded = false;
            let endDetails = null;

            const allVoted = allPlayersVoted(game.players);
            if (allVoted) {
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
                gameEnded = true;
                endDetails = { mostVotedId, isCorrect, endReason };
            }

            return { game, result: { alreadyVoted: false, game, player, allVoted, gameEnded, endDetails } };
        });

        if (!result) return NextResponse.json({ error: 'Game not found or lock failed' }, { status: 404 });

        const { alreadyVoted, game, player, allVoted, gameEnded, endDetails } = result;

        if (!alreadyVoted) {
            const activePlayers = game.players.filter(p => p.isActive);
            const votedCount = activePlayers.filter(p => p.hasVoted).length;

            // 1. Broadcast vote
            await broadcastImposterAction(gameToken, {
                type: 'PLAYER_VOTED',
                voterName: player.name,
                votedCount,
                totalActive: activePlayers.length
            });

            // 2. Milestones
            if (votedCount === 1) {
                await broadcastImposterAction(gameToken, { type: 'MILESTONE', message: `[FIRST VOTE] ${player.name} VOTED!` });
            }

            if (allVoted) {
                await broadcastImposterAction(gameToken, { type: 'MILESTONE', message: '[ALL VOTES IN] REVEALING RESULTS...' });
            }

            // 3. Game Ended
            if (gameEnded) {
                // Build vote results
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

                await broadcastImposterAction(gameToken, {
                    type: 'GAME_ENDED',
                    result: game.result!,
                    imposterName: game.players.find(p => p.id === game.imposterId)?.name || 'Unknown',
                    endReason: game.endReason!,
                    voteResults
                });

                setTimeout(async () => {
                    await broadcastImposterAction(gameToken, { type: 'WORD_READY' });
                }, 500);
            }
        }

        return NextResponse.json({ success: true, gameStatus: game.gameStatus, alreadyVoted });
    } catch (error: any) {
        console.error('Error processing vote:', error);
        return NextResponse.json({ error: error.message || 'Failed to process vote' }, { status: 500 });
    }
}
