import GameRoom from '@/components/GameRoom';

export default async function GamePage({ 
  params 
}: { 
  params: Promise<{ token: string }> 
}) {
  const { token } = await params;
  return <GameRoom gameToken={token} />;
}
