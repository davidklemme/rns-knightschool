'use client';

import { useState, useCallback } from 'react';
import { useMediaQuery } from '@/hooks/useMediaQuery';
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
import { GameReview } from '@/components/analysis/GameReview';
import type { PlayerMode, Color } from '@/lib/chess/types';
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
    highlights,
    pieceStatuses,
    lastMove,
    isThinking,
    aiError,
    requestAIMove,
    resignGame,
    showLegalMoves,
    showDanger,
    currentTactic,
    coachMessage,
    playerName,
    playerMode,
    pendingPromotion,
    evaluation,
    showEval,
    gameAnalysis,
    isAnalyzing,
    analysisProgress,
    showReview,
    startAnalysis,
    closeReview,
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
  const isCompact = useMediaQuery('(max-width: 639px), (orientation: landscape) and (max-height: 499px)');

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
          <div className="flex gap-1 w-full items-stretch">
            {showEval && (
              <EvalBar
                score={evaluation?.score ?? 0}
                mate={evaluation?.mate ?? null}
                isFlipped={playerColor === 'b'}
                className="h-auto self-stretch shrink-0"
              />
            )}
            <Board
              className="flex-1 min-w-[360px]"
              board={engine.board()}
              highlights={highlights}
              pieceStatuses={pieceStatuses}
              lastMove={lastMove}
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
              isThinking={isThinking}
            />
            <TacticCelebration tactic={currentTactic} onDismiss={dismissTactic} playerName={playerName || undefined} />
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
            onResign={resignGame}
            aiError={aiError}
            onRetry={requestAIMove}
            onNewGame={handleNewGame}
            onToggleLegalMoves={toggleLegalMoves}
            onToggleDanger={toggleDanger}
            onToggleEval={toggleEval}
            onReview={startAnalysis}
            showLegalMoves={showLegalMoves}
            showDanger={showDanger}
            showEval={showEval}
            canUndo={historyIndex >= 0}
            canReview={
              historyIndex >= 0 && (isGameOver || engine.turn === playerColor)
            }
            isThinking={isThinking}
            isGameOver={isGameOver}
            isCompact={isCompact}
          />
        }
      />

      {/* Promotion modal */}
      <PromotionModal
        isOpen={!!pendingPromotion}
        color={playerColor}
        onSelect={handlePromotion}
        onCancel={cancelPromotion}
      />

      {/* Game review overlay */}
      {showReview && (
        <GameReview
          analysis={gameAnalysis}
          isAnalyzing={isAnalyzing}
          progress={analysisProgress}
          playerColor={playerColor}
          onClose={closeReview}
        />
      )}
    </>
  );
}
