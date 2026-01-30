import { NextRequest, NextResponse } from 'next/server';
import { getOnlinePlayers, withGameLock } from '@/lib/imposterStorage';
import { broadcastImposterRefresh } from '@/lib/pusher';

interface PruneResult {
    noOp?: boolean;
    shouldRefresh?: boolean;
}

export async function POST(request: NextRequest) {
    try {
        const { gameToken, playerId } = await request.json();

        if (!gameToken || !playerId) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
        }

        // We use lock because we might change game state (prune players or change phase)
        const result = await withGameLock<PruneResult>(gameToken, async (game) => {
            // Only proceed if game is in SCRATCHING phase
            if (game.gameStatus !== 'SCRATCHING') {
                return { game, result: { noOp: true } };
            }

            const activePlayers = game.players.filter(p => p.isActive);
            if (activePlayers.length === 0) return { game, result: { noOp: true } };

            // Check which active players are actually ONLINE (have recent heartbeat)
            const activePlayerIds = activePlayers.map(p => p.id);
            const onlineIds = await getOnlinePlayers(gameToken, activePlayerIds);
            const onlineIdSet = new Set(onlineIds);

            // Check if all ONLINE players have scratched
            const onlinePlayers = activePlayers.filter(p => onlineIdSet.has(p.id));

            if (onlinePlayers.length === 0) {
                return { game, result: { noOp: true } };
            }

            const allOnlineScratched = onlinePlayers.every(p => p.hasScratched);

            // Also check if there are offline players who haven't scratched
            const offlineUnscratched = activePlayers.filter(p => !onlineIdSet.has(p.id) && !p.hasScratched);

            // If all online have scratched, AND there are offline unscratched players blocking us...
            if (allOnlineScratched && offlineUnscratched.length > 0) {
                // Return flag to trigger refresh
                return { game, result: { shouldRefresh: true } };
            }

            return { game, result: { noOp: true } };
        });

        if (result && result.shouldRefresh) {
            await broadcastImposterRefresh(gameToken, 'prune-check');
            return NextResponse.json({ success: true, refreshed: true });
        }

        return NextResponse.json({ success: true, noOp: true });

    } catch (error) {
        console.error('Check-Prune error:', error);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
