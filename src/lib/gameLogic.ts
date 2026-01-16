import { Character, Player } from '@/types/game';

export function generateGameToken(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

/**
 * Fisher-Yates shuffle algorithm for true random distribution
 * More reliable than Array.sort() with random comparator
 */
function fisherYatesShuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function shuffleAndAssignCharacters(players: Player[]): Player[] {
  const characters: Character[] = ['RAJA', 'MANTRI', 'CHOR', 'SIPAHI'];
  
  // Use Fisher-Yates shuffle for truly random distribution
  const shuffled = fisherYatesShuffle(characters);
  
  return players.map((player, index) => ({
    ...player,
    character: shuffled[index]
  }));
}

export function calculateRoundScores(
  players: Player[],
  mantriGuessedId: string
): { updatedPlayers: Player[]; isCorrect: boolean } {
  const chor = players.find(p => p.character === 'CHOR');
  const mantri = players.find(p => p.character === 'MANTRI');
  const sipahi = players.find(p => p.character === 'SIPAHI');
  const raja = players.find(p => p.character === 'RAJA');

  if (!chor || !mantri || !sipahi || !raja) {
    throw new Error('Missing characters');
  }

  const isCorrect = mantriGuessedId === chor.id;

  const updatedPlayers = players.map(player => {
    let pointsToAdd = 0;

    if (player.character === 'RAJA') {
      pointsToAdd = 1000;
    } else if (player.character === 'MANTRI') {
      pointsToAdd = isCorrect ? 800 : 0;
    } else if (player.character === 'CHOR') {
      pointsToAdd = isCorrect ? 0 : 800;
    } else if (player.character === 'SIPAHI') {
      pointsToAdd = 500;
    }

    return {
      ...player,
      score: player.score + pointsToAdd
    };
  });

  return { updatedPlayers, isCorrect };
}

export function resetCharacters(players: Player[]): Player[] {
  return players.map(player => ({
    ...player,
    character: null
  }));
}
