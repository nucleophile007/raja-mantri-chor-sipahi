import { NextRequest, NextResponse } from 'next/server';
import { pusherServer } from '@/lib/pusher';
import { getImposterGame } from '@/lib/imposterStorage';

export async function POST(request: NextRequest) {
    try {
        // Accept both x-www-form-urlencoded (web) and JSON (mobile).
        const rawBody = await request.text();
        const params = new URLSearchParams(rawBody);

        let socketId = params.get('socket_id');
        let channelName = params.get('channel_name');
        let userId = params.get('user_id');

        if ((!socketId || !channelName || !userId) && rawBody) {
            try {
                const jsonBody = JSON.parse(rawBody) as {
                    socket_id?: string;
                    channel_name?: string;
                    user_id?: string;
                };
                socketId = socketId || jsonBody.socket_id || null;
                channelName = channelName || jsonBody.channel_name || null;
                userId = userId || jsonBody.user_id || null;
            } catch {
                // Not JSON, ignore.
            }
        }

        // Header fallback helps mobile clients avoid form auth conventions.
        const headerUserId = request.headers.get('x-player-id');
        if (!userId && headerUserId) {
            userId = headerUserId;
        }

        if (!socketId || !channelName || !userId) {
            return NextResponse.json({ error: 'Missing auth params' }, { status: 400 });
        }

        // Extract and validate token from channelName "presence-imposter-{token}".
        let realName = 'Player';

        if (channelName.startsWith('presence-imposter-')) {
            const tokenFromChannel = channelName.replace('presence-imposter-', '').toUpperCase();
            const tokenFromHeader = request.headers.get('x-game-token')?.toUpperCase();
            if (tokenFromHeader && tokenFromHeader !== tokenFromChannel) {
                return NextResponse.json({ error: 'Game token mismatch for channel auth' }, { status: 403 });
            }

            const game = await getImposterGame(tokenFromChannel);
            if (!game) {
                return NextResponse.json({ error: 'Game not found for channel' }, { status: 404 });
            }

            const player = game.players.find(p => p.id === userId && p.isActive);
            if (!player) {
                return NextResponse.json({ error: 'Player not found in active game' }, { status: 403 });
            }

            realName = player.name;
        }

        const presenceData = {
            user_id: userId,
            user_info: {
                name: realName
            }
        };

        const authResponse = pusherServer.authorizeChannel(socketId, channelName, presenceData);
        return NextResponse.json(authResponse);

    } catch (error) {
        console.error('Pusher auth error:', error);
        return NextResponse.json({ error: 'Auth failed' }, { status: 500 });
    }
}
