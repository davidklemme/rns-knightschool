'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PlayerSelectProps {
  onSelect: (name: string, mode: 'ruby' | 'sammy') => void;
}

const PRESET_PLAYERS = [
  { name: 'Ruby', mode: 'ruby' as const, emoji: '🌟' },
  { name: 'Sammy', mode: 'sammy' as const, emoji: '🎯' },
];

/**
 * PlayerSelect - First-time player selection modal
 *
 * The Coach's first greeting! Asks who's playing so we can
 * personalize the experience for Ruby, Sammy, or anyone else.
 */
export function PlayerSelect({ onSelect }: PlayerSelectProps) {
  const [showCustom, setShowCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [selectedMode, setSelectedMode] = useState<'ruby' | 'sammy'>('ruby');

  const handleCustomSubmit = () => {
    if (customName.trim()) {
      onSelect(customName.trim(), selectedMode);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCustomSubmit();
    }
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-amber-600 via-orange-600 to-yellow-600 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center pb-2">
          <div className="text-5xl mb-3" role="img" aria-label="Knight">
            &#9816;
          </div>
          <CardTitle className="text-2xl text-gray-800">
            Welcome to KnightSchool!
          </CardTitle>
          <p className="text-muted-foreground mt-2">
            Who&apos;s learning chess today?
          </p>
        </CardHeader>

        <CardContent className="space-y-4 pt-4">
          {!showCustom ? (
            <>
              {/* Preset player buttons */}
              <div className="flex gap-4 justify-center">
                {PRESET_PLAYERS.map((player) => (
                  <Button
                    key={player.name}
                    size="lg"
                    className="text-lg px-8 py-6 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-md"
                    onClick={() => onSelect(player.name, player.mode)}
                  >
                    <span className="mr-2">{player.emoji}</span>
                    {player.name}
                  </Button>
                ))}
              </div>

              {/* Someone else option */}
              <Button
                variant="outline"
                className="w-full text-muted-foreground"
                onClick={() => setShowCustom(true)}
              >
                Someone else...
              </Button>
            </>
          ) : (
            <div className="space-y-4">
              <Input
                placeholder="Enter your name"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
                className="text-center text-lg h-12"
              />

              {/* Mode selection for custom player */}
              <div className="space-y-2">
                <p className="text-sm text-center text-muted-foreground">
                  Choose your skill level:
                </p>
                <div className="flex gap-2">
                  <Button
                    variant={selectedMode === 'ruby' ? 'default' : 'outline'}
                    className={`flex-1 ${selectedMode === 'ruby' ? 'bg-gradient-to-r from-amber-500 to-orange-500' : ''}`}
                    onClick={() => setSelectedMode('ruby')}
                  >
                    <span className="mr-2">🌟</span>
                    Learning
                  </Button>
                  <Button
                    variant={selectedMode === 'sammy' ? 'default' : 'outline'}
                    className={`flex-1 ${selectedMode === 'sammy' ? 'bg-gradient-to-r from-amber-500 to-orange-500' : ''}`}
                    onClick={() => setSelectedMode('sammy')}
                  >
                    <span className="mr-2">🎯</span>
                    Challenge
                  </Button>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowCustom(false);
                    setCustomName('');
                  }}
                >
                  Back
                </Button>
                <Button
                  className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
                  onClick={handleCustomSubmit}
                  disabled={!customName.trim()}
                >
                  Let&apos;s play!
                </Button>
              </div>
            </div>
          )}

          {/* Skip option */}
          <button
            onClick={() => onSelect('', 'ruby')}
            className="w-full text-center text-sm text-muted-foreground hover:text-gray-600 transition-colors"
          >
            Skip for now
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
