'use client';

import { useState, useEffect, useCallback } from 'react';
import { useChessStore } from '@/store/chessStore';
import { GameShell } from '@/components/layout/GameShell';
import { Header } from '@/components/layout/Header';
import { Board } from '@/components/chess/Board';
import { EvalBar } from '@/components/chess/EvalBar';
import { CoachZone } from '@/components/coach/CoachZone';
import { ActionBar } from '@/components/controls/ActionBar';
import { PlayerSelect } from '@/components/coach/PlayerSelect';
import { TacticCelebration } from '@/components/coach/TacticCelebration';
import { PromotionModal } from '@/components/controls/PromotionModal';
import { CapturedPieces } from '@/components/chess/CapturedPieces';
import type { PlayerMode, SkillLevel, Color } from '@/lib/chess/types';
import { PLAYER_CONFIGS } from '@/lib/chess/types';

/**
 * Main chess game page
 *
 * Assembles all components using the GameShell layout:
 * - Header: Player info and game controls
 * - Board: The chess board with pieces and highlights
 * - Coach: CoachZone with color legend and messages
 * - Controls: ActionBar with undo, hint, resign, toggles
 */
export default function PlayPage() {
  const [showPlayerSelect, setShowPlayerSelect] = useState(true);

  // Get state and actions from store
  const {
    engine,
    playerColor,
    skillLevel,
    isGameOver,
    moveHistory,
    historyIndex,
    selectedSquare,
    highlights,
    lastMove,
    isThinking,
    showLegalMoves,
    showDanger,
    currentTactic,
    coachMessage,
    playerName,
    playerMode,
    pendingPromotion,
    evaluation,
    showEval,
    startNewGame,
    selectSquare,
    makeMove,
    undoMove,
    resetGame,
    setPlayerInfo,
    toggleLegalMoves,
    toggleDanger,
    toggleEval,
    dismissTactic,
    cancelPromotion,
    useHint,
    setSkillLevel,
  } = useChessStore();

  // Handle player selection
  const handlePlayerSelect = useCallback(
    (name: string, mode: PlayerMode, color: Color) => {
      setPlayerInfo(name || null, mode);
      setShowPlayerSelect(false);

      // Start a new game with appropriate skill level
      const config = PLAYER_CONFIGS[mode];
      startNewGame(color, config.defaultSkillLevel);
    },
    [setPlayerInfo, startNewGame]
  );

  // Handle new game
  const handleNewGame = useCallback(() => {
    // Show player select again or just reset
    if (isGameOver) {
      setShowPlayerSelect(true);
    } else {
      resetGame();
    }
  }, [isGameOver, resetGame]);

  // Handle resign
  const handleResign = useCallback(() => {
    // For kids, we'll just start a new game instead of formal resignation
    setShowPlayerSelect(true);
  }, []);

  // Handle promotion selection
  const handlePromotion = useCallback(
    (piece: 'q' | 'r' | 'b' | 'n') => {
      if (pendingPromotion) {
        makeMove(pendingPromotion.from, pendingPromotion.to, piece);
      }
    },
    [pendingPromotion, makeMove]
  );

  // Determine if in compact/simple mode
  const isSimpleMode = playerMode === 'ruby';
  const isCompact =
    typeof window !== 'undefined' &&
    (window.innerWidth < 640 ||
      (window.matchMedia('(orientation: landscape)').matches &&
        window.innerHeight < 500));

  // Player select modal
  if (showPlayerSelect) {
    return <PlayerSelect onSelect={handlePlayerSelect} />;
  }

  return (
    <>
      <GameShell
        header={
          <Header
            playerName={playerName}
            playerColor={playerColor}
            skillLevel={skillLevel}
            isThinking={isThinking}
            onNewGame={handleNewGame}
            onChangeSkill={setSkillLevel}
          />
        }
        board={
          <div className="flex gap-1 h-full w-full items-center justify-center">
            {showEval && (
              <EvalBar
                score={evaluation?.score ?? 0}
                mate={evaluation?.mate ?? null}
                isFlipped={playerColor === 'b'}
                className="h-full max-h-[45vh] landscape:max-h-full lg:max-h-[min(100%,500px)]"
              />
            )}
            <Board
              board={engine.board()}
              highlights={highlights}
              onSquareClick={selectSquare}
              isFlipped={playerColor === 'b'}
              showCoordinates={true}
            />
          </div>
        }
        coach={
          <div className="flex flex-col gap-2">
            <CoachZone
              playerName={playerName}
              message={coachMessage}
              isCompact={isCompact}
              isSimpleMode={isSimpleMode}
            />
            {moveHistory.length > 0 && (
              <CapturedPieces
                moveHistory={moveHistory}
                playerColor={playerColor}
                className="px-3 py-2 bg-white/60 rounded-lg"
              />
            )}
          </div>
        }
        controls={
          <ActionBar
            onUndo={undoMove}
            onHint={useHint}
            onResign={handleResign}
            onNewGame={handleNewGame}
            onToggleLegalMoves={toggleLegalMoves}
            onToggleDanger={toggleDanger}
            onToggleEval={toggleEval}
            showLegalMoves={showLegalMoves}
            showDanger={showDanger}
            showEval={showEval}
            canUndo={historyIndex >= 0}
            isThinking={isThinking}
            isGameOver={isGameOver}
            isCompact={isCompact}
          />
        }
      />

      {/* Tactic celebration modal */}
      <TacticCelebration
        tactic={currentTactic}
        onDismiss={dismissTactic}
        playerName={playerName || undefined}
      />

      {/* Promotion modal */}
      <PromotionModal
        isOpen={!!pendingPromotion}
        color={playerColor}
        onSelect={handlePromotion}
        onCancel={cancelPromotion}
      />
    </>
  );
}
