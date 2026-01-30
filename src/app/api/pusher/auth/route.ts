import { NextRequest, NextResponse } from 'next/server';
import { pusherServer } from '@/lib/pusher';
import { getImposterGame } from '@/lib/imposterStorage';

export async function POST(request: NextRequest) {
    try {
        // Pusher client sends form-url-encoded body by default for auth
        const text = await request.text();
        const params = new URLSearchParams(text);

        const socketId = params.get('socket_id');
        const channelName = params.get('channel_name');

        // Pusher JS sends auth params (user_id, user_name) in the BODY as form data
        // when using `auth.params`. It does NOT send them in the URL by default.
        const userId = params.get('user_id');
        // We ignore user_name from client for security/consistency and fetch from DB

        if (!socketId || !channelName || !userId) {
            return NextResponse.json({ error: 'Missing auth params' }, { status: 400 });
        }

        // Extract gameToken from channelName "presence-imposter-{token}"
        // or "game-{token}"? Presence is only for "presence-imposter-"
        let realName = 'Player';

        if (channelName.startsWith('presence-imposter-')) {
            const token = channelName.replace('presence-imposter-', '');
            // Fetch game to get real name
            const game = await getImposterGame(token);
            if (game) {
                const player = game.players.find(p => p.id === userId);
                if (player) {
                    realName = player.name;
                }
            }
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
