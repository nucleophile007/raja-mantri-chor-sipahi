'use client';

import React from 'react';
import { ImposterPlayerClient, VoteClient } from '@/types/imposter';

interface VotingPanelProps {
    players: ImposterPlayerClient[];
    votes: VoteClient[];
    hasVoted: boolean;
    isVotingActive: boolean;
    onVote: (targetName: string) => void;  // Vote by name, not ID
    loading: boolean;
}

export default function VotingPanel({
    players,
    votes,
    hasVoted,
    isVotingActive,
    onVote,
    loading
}: VotingPanelProps) {
    const activePlayers = players.filter(p => p.isActive);
    const votedNames = votes.map(v => v.voterName);

    return (
        <div className="pixel-card p-6">
            <h2 className="pixel-text mb-4 text-center" style={{ color: 'var(--pixel-dark)' }}>
                🗳️ Vote for the Imposter
            </h2>

            {/* Voting status */}
            <div className="mb-4 text-center">
                <span className="text-sm" style={{ color: 'var(--pixel-dark)' }}>
                    {votes.length} / {activePlayers.length} players voted
                </span>
                <div className="w-full bg-gray-200 rounded h-2 mt-2">
                    <div
                        className="h-2 rounded transition-all"
                        style={{
                            width: `${(votes.length / activePlayers.length) * 100}%`,
                            background: 'var(--pixel-primary)'
                        }}
                    />
                </div>
            </div>

            {/* Player list for voting */}
            <div className="space-y-3">
                {activePlayers.map((player, idx) => {
                    const isCurrentPlayer = player.isMe;
                    const playerHasVoted = votedNames.includes(player.name);

                    return (
                        <div
                            key={idx}
                            className="pixel-card p-4 flex items-center justify-between"
                            style={{
                                background: isCurrentPlayer ? 'var(--pixel-primary-light)' : 'white',
                                opacity: isCurrentPlayer ? 0.6 : 1
                            }}
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">
                                    {player.isHost ? '👑' : '👤'}
                                </span>
                                <div>
                                    <span className="font-bold" style={{ color: 'var(--pixel-dark)' }}>
                                        {player.name}
                                        {isCurrentPlayer && ' (You)'}
                                    </span>
                                    {playerHasVoted && (
                                        <span className="ml-2 text-green-600 text-sm">✓ Voted</span>
                                    )}
                                </div>
                            </div>

                            {/* Vote button - vote by name */}
                            {isVotingActive && !hasVoted && !isCurrentPlayer && (
                                <button
                                    onClick={() => onVote(player.name)}
                                    disabled={loading}
                                    className="pixel-btn text-sm"
                                    style={{
                                        background: 'var(--pixel-danger)',
                                        color: 'white',
                                        opacity: loading ? 0.5 : 1
                                    }}
                                >
                                    {loading ? '...' : 'Vote'}
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Status message */}
            <div className="mt-4 text-center">
                {hasVoted ? (
                    <div className="pixel-card p-3" style={{ background: 'var(--pixel-success)', color: 'white' }}>
                        ✓ You have voted! Waiting for others...
                    </div>
                ) : isVotingActive ? (
                    <p className="text-sm" style={{ color: 'var(--pixel-dark)' }}>
                        Click &quot;Vote&quot; next to the player you think is the Imposter
                    </p>
                ) : null}
            </div>
        </div>
    );
}
