import { NextRequest, NextResponse } from 'next/server';
import { getGame } from '@/lib/storage';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const gameToken = searchParams.get('gameToken');
    
    if (!gameToken) {
      return NextResponse.json(
        { error: 'Game token is required' },
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

    return NextResponse.json({
      success: true,
      gameState: game
    });
  } catch (error) {
    console.error('Error fetching game state:', error);
    return NextResponse.json(
      { error: 'Failed to fetch game state' },
      { status: 500 }
    );
  }
}
