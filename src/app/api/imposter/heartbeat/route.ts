import { NextRequest, NextResponse } from 'next/server';
import { getImposterGame, updateImposterGame } from '@/lib/imposterStorage';
import { pusherServer } from '@/lib/pusher';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { gameToken, playerId } = body;

        if (!gameToken || !playerId) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
        }

        const game = await getImposterGame(gameToken);
        if (!game) {
            return NextResponse.json({ error: 'Game not found' }, { status: 404 });
        }

        const playerIndex = game.players.findIndex(p => p.id === playerId);
        if (playerIndex === -1) {
            return NextResponse.json({ error: 'Player not found' }, { status: 404 });
        }

        // Update heartbeat
        // OPTIMIZATION: Throttling writes to every 10s (vs 5s ping) to halve Redis load
        const lastHb = game.players[playerIndex].lastHeartbeat || 0;
        // Only update if > 10s elapsed
        if (Date.now() - lastHb < 10000) {
            return NextResponse.json({ success: true, optimized: true });
        }

        game.players[playerIndex].lastHeartbeat = Date.now();

        // ---------------------------------------------------------
        // LAZY PRUNING & AUTO-PROGRESS CHECK
        // ---------------------------------------------------------
        // Check if we can proceed to next phase even if some players are offline
        // Only run this check if the requester is Host to reduce load/redundancy,
        // OR simply run it every time but minimize heavy logic.
        // Let's run it if gameStatus is SCRATCHING.

        let stateChanged = false; // Flag if we need to broadcast a major update

        if (game.gameStatus === 'SCRATCHING') {
            const now = Date.now();
            // Active players are those who are theoretically in the game
            // Online players are standard "active" players who have heartbeat in last 20s
            // OR players who joined recently (< 20s)

            const OFFLINE_THRESHOLD = 20000; // 20 seconds

            const activePlayers = game.players.filter(p => p.isActive);

            // Check if all ONLINE players have scratched
            const onlinePlayers = activePlayers.filter(p => {
                const lastSeen = p.lastHeartbeat || p.joinedAt;
                return (now - lastSeen) < OFFLINE_THRESHOLD;
            });

            if (onlinePlayers.length > 0) {
                const allOnlineScratched = onlinePlayers.every(p => p.hasScratched);

                // If all online players are done, but total active is not (meaning some offline players haven't scratched),
                // we can't trigger the "ALL DONE" state transition that usually happens in scratch/route.ts
                // UNLESS we explicitly decide to ignore offline players.

                // Ideally, we don't change state here to avoid race conditions with scratch/route.ts
                // But we can trigger a 'force-refresh' if we detect valid completion.

                // Better: If all online have scratched, we do nothing here? 
                // We rely on Host "Force Proceed" button for true unblocking.
                // Heartbeat just updates presence.
            }
        }

        await updateImposterGame(gameToken, game);

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Heartbeat error:', error);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
