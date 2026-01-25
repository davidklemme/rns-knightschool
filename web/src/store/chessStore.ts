/**
 * Chess game state management with Zustand
 * Following the SuDoCoach pattern for state management
 */

import { create } from 'zustand';
import { ChessEngine, createEngine } from '@/lib/chess/engine';
import { analyzeDanger, getDangerMessage } from '@/lib/chess/danger';
import { detectTactics, getTacticExplanation } from '@/lib/chess/tactics';
import { getPieceStatuses, findAbandonmentWarnings } from '@/lib/chess/move-safety';
import { calculateHighlights } from '@/lib/colors/chess-highlights';
import type {
  Square,
  Color,
  SkillLevel,
  ChessMove,
  TacticResult,
  HighlightMap,
  PlayerMode,
  GameOutcome,
  PieceVisualStatus,
  SKILL_CONFIGS,
  PLAYER_CONFIGS,
} from '@/lib/chess/types';
import { SKILL_CONFIGS as skillConfigs, PLAYER_CONFIGS as playerConfigs } from '@/lib/chess/types';

export interface ChessGameState {
  // Game engine
  engine: ChessEngine;
  playerColor: Color;
  skillLevel: SkillLevel;
  isGameOver: boolean;
  gameOutcome: GameOutcome;

  // History
  moveHistory: ChessMove[];
  historyIndex: number;

  // UI State
  selectedSquare: Square | null;
  highlights: HighlightMap;
  lastMove: ChessMove | null;
  isThinking: boolean;

  // Teaching
  showLegalMoves: boolean;
  showDanger: boolean;
  currentTactic: TacticResult | null;
  coachMessage: string | null;
  pieceStatuses: Map<Square, PieceVisualStatus>;

  // Player
  playerName: string | null;
  playerMode: PlayerMode;

  // Hint state
  hintSquare: Square | null;
  hintsUsed: number;

  // Promotion state
  pendingPromotion: { from: Square; to: Square } | null;

  // Actions
  startNewGame: (color: Color, skill: SkillLevel) => void;
  selectSquare: (square: Square) => void;
  makeMove: (from: Square, to: Square, promotion?: 'q' | 'r' | 'b' | 'n') => void;
  requestAIMove: () => Promise<void>;
  useHint: () => void;
  undoMove: () => void;
  resetGame: () => void;
  setPlayerInfo: (name: string | null, mode: PlayerMode) => void;
  toggleLegalMoves: () => void;
  toggleDanger: () => void;
  dismissTactic: () => void;
  cancelPromotion: () => void;
  updateHighlights: () => void;
  updatePieceStatuses: () => void;
}

export const useChessStore = create<ChessGameState>((set, get) => ({
  // Initial state
  engine: createEngine(),
  playerColor: 'w',
  skillLevel: 'learning',
  isGameOver: false,
  gameOutcome: null,
  moveHistory: [],
  historyIndex: -1,
  selectedSquare: null,
  highlights: new Map(),
  lastMove: null,
  isThinking: false,
  showLegalMoves: true,
  showDanger: true,
  currentTactic: null,
  coachMessage: null,
  pieceStatuses: new Map(),
  playerName: null,
  playerMode: 'ruby',
  hintSquare: null,
  hintsUsed: 0,
  pendingPromotion: null,

  // Start a new game
  startNewGame: (color: Color, skill: SkillLevel) => {
    const engine = createEngine();
    const config = skillConfigs[skill];
    const { playerMode, playerName } = get();
    const playerConfig = playerConfigs[playerMode];

    set({
      engine,
      playerColor: color,
      skillLevel: skill,
      isGameOver: false,
      gameOutcome: null,
      moveHistory: [],
      historyIndex: -1,
      selectedSquare: null,
      highlights: new Map(),
      lastMove: null,
      isThinking: false,
      showLegalMoves: config.showLegalMoves,
      showDanger: config.showDanger,
      currentTactic: null,
      coachMessage: playerName
        ? `Let's play, ${playerName}! You're ${color === 'w' ? 'White' : 'Black'}.`
        : `Game on! You're ${color === 'w' ? 'White' : 'Black'}.`,
      pieceStatuses: new Map(),
      hintSquare: null,
      hintsUsed: 0,
      pendingPromotion: null,
    });

    // If playing black, AI makes first move
    if (color === 'b') {
      setTimeout(() => get().requestAIMove(), 500);
    }
  },

  // Select a square
  selectSquare: (square: Square) => {
    const { engine, selectedSquare, playerColor, isThinking, pendingPromotion } = get();

    // Don't allow selection during AI thinking or promotion dialog
    if (isThinking || pendingPromotion) return;

    // If it's not the player's turn, don't allow selection
    if (engine.turn !== playerColor) return;

    const piece = engine.get(square);

    // If clicking on own piece, select it
    if (piece && piece.color === playerColor) {
      set({ selectedSquare: square, hintSquare: null });
      get().updateHighlights();
      get().updatePieceStatuses();
      return;
    }

    // If a piece is already selected, try to move
    if (selectedSquare) {
      const fromPiece = engine.get(selectedSquare);

      // Check if this is a pawn promotion move
      if (fromPiece?.type === 'p') {
        const isPromotion =
          (playerColor === 'w' && square[1] === '8') ||
          (playerColor === 'b' && square[1] === '1');

        if (isPromotion && engine.isLegalMove(selectedSquare, square)) {
          // Show promotion dialog
          set({ pendingPromotion: { from: selectedSquare, to: square } });
          return;
        }
      }

      // Try to make the move
      get().makeMove(selectedSquare, square);
    }
  },

  // Make a move
  makeMove: (from: Square, to: Square, promotion?: 'q' | 'r' | 'b' | 'n') => {
    const { engine, playerColor, moveHistory, historyIndex } = get();

    // Attempt the move
    const move = engine.move(from, to, promotion);

    if (!move) {
      // Invalid move - deselect
      set({ selectedSquare: null, pendingPromotion: null });
      get().updateHighlights();
      return;
    }

    // Update history
    const newHistory = moveHistory.slice(0, historyIndex + 1);
    newHistory.push(move);

    // Check for tactics
    const tactic = detectTactics(engine, move);

    // Check game end conditions
    const gameEnded = engine.isGameOver;
    let newOutcome: GameOutcome = null;
    let newMessage: string | null = null;

    if (engine.isCheckmate) {
      newOutcome = 'checkmate';
      newMessage = engine.turn !== playerColor
        ? "CHECKMATE! You won! Amazing!"
        : "Checkmate... The AI won this time. Try again!";
    } else if (engine.isStalemate) {
      newOutcome = 'stalemate';
      newMessage = "Stalemate! It's a draw - no legal moves but not in check.";
    } else if (engine.isDraw) {
      newOutcome = 'draw';
      newMessage = "It's a draw!";
    } else if (tactic) {
      newMessage = tactic.message;
    } else {
      // Check for danger
      const dangerAnalysis = analyzeDanger(engine, playerColor);
      const dangerMsg = getDangerMessage(dangerAnalysis, get().playerName || undefined);
      if (dangerMsg) {
        newMessage = dangerMsg;
      }
    }

    set({
      moveHistory: newHistory,
      historyIndex: newHistory.length - 1,
      selectedSquare: null,
      lastMove: move,
      currentTactic: tactic,
      coachMessage: newMessage,
      isGameOver: gameEnded,
      gameOutcome: newOutcome,
      hintSquare: null,
      pendingPromotion: null,
    });

    get().updateHighlights();
    get().updatePieceStatuses();

    // If game not over and it's AI's turn, request AI move
    if (!gameEnded && engine.turn !== playerColor) {
      setTimeout(() => get().requestAIMove(), 500);
    }
  },

  // Request AI move
  requestAIMove: async () => {
    const { engine, playerColor, skillLevel, isGameOver } = get();

    if (isGameOver || engine.turn === playerColor) return;

    set({ isThinking: true, coachMessage: "Hmm, let me think..." });

    // Simulate AI thinking (in real implementation, this calls Stockfish)
    await new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 1000));

    const config = skillConfigs[skillLevel];
    const legalMoves = engine.getAllLegalMoves();

    if (legalMoves.length === 0) {
      set({ isThinking: false });
      return;
    }

    // Simple AI: pick a random move (weighted by captures)
    // In real implementation, this would call Stockfish with skill level
    let selectedMove: ChessMove;

    if (Math.random() < config.aiMistakeRate) {
      // Make a "mistake" - pick a random move
      selectedMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
    } else {
      // Pick a "good" move - prefer captures and checks
      const captures = legalMoves.filter((m) => m.captured);
      const checks = legalMoves.filter((m) => {
        const testEngine = engine.clone();
        testEngine.move(m.from, m.to, m.promotion);
        return testEngine.isCheck;
      });

      if (checks.length > 0) {
        selectedMove = checks[Math.floor(Math.random() * checks.length)];
      } else if (captures.length > 0) {
        selectedMove = captures[Math.floor(Math.random() * captures.length)];
      } else {
        selectedMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
      }
    }

    // Make the AI move
    const move = engine.move(selectedMove.from, selectedMove.to, selectedMove.promotion);

    if (!move) {
      set({ isThinking: false });
      return;
    }

    const { moveHistory: currentHistory, historyIndex: currentIdx } = get();
    const updatedHistory = currentHistory.slice(0, currentIdx + 1);
    updatedHistory.push(move);

    // Check game end conditions
    const aiGameEnded = engine.isGameOver;
    let aiOutcome: GameOutcome = null;
    let aiMessage: string | null = "Your turn!";

    if (engine.isCheckmate) {
      aiOutcome = 'checkmate';
      aiMessage = "Checkmate... The AI won this time. Don't give up!";
    } else if (engine.isStalemate) {
      aiOutcome = 'stalemate';
      aiMessage = "Stalemate! It's a draw.";
    } else if (engine.isDraw) {
      aiOutcome = 'draw';
      aiMessage = "It's a draw!";
    } else if (engine.isCheck) {
      aiMessage = "Check! Your king is in danger!";
    }

    set({
      moveHistory: updatedHistory,
      historyIndex: updatedHistory.length - 1,
      lastMove: move,
      isThinking: false,
      isGameOver: aiGameEnded,
      gameOutcome: aiOutcome,
      coachMessage: aiMessage,
    });

    get().updateHighlights();
    get().updatePieceStatuses();
  },

  // Use a hint
  useHint: () => {
    const { engine, playerColor, isThinking, hintsUsed, playerName } = get();

    if (isThinking || engine.turn !== playerColor) return;

    const legalMoves = engine.getAllLegalMoves();
    if (legalMoves.length === 0) return;

    // Find a good move to suggest
    // Priority: Checkmate > Capture > Check > Random
    let bestMove: ChessMove | null = null;

    for (const move of legalMoves) {
      const testEngine = engine.clone();
      testEngine.move(move.from, move.to, move.promotion);

      if (testEngine.isCheckmate) {
        bestMove = move;
        break;
      }
    }

    if (!bestMove) {
      const captures = legalMoves.filter((m) => m.captured);
      if (captures.length > 0) {
        bestMove = captures[0];
      }
    }

    if (!bestMove) {
      const checks = legalMoves.filter((m) => {
        const testEngine = engine.clone();
        testEngine.move(m.from, m.to, m.promotion);
        return testEngine.isCheck;
      });
      if (checks.length > 0) {
        bestMove = checks[0];
      }
    }

    if (!bestMove) {
      bestMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
    }

    const pieceNames: Record<string, string> = {
      p: 'pawn',
      n: 'knight',
      b: 'bishop',
      r: 'rook',
      q: 'queen',
      k: 'king',
    };

    const pieceName = pieceNames[bestMove.piece];
    const name = playerName || 'you';

    set({
      hintSquare: bestMove.from,
      hintsUsed: hintsUsed + 1,
      coachMessage: `Try moving your ${pieceName}! Tap the highlighted piece.`,
      selectedSquare: null,
    });

    get().updateHighlights();
  },

  // Undo last move (undo both player and AI moves)
  undoMove: () => {
    const { engine, moveHistory, historyIndex, playerColor, isThinking } = get();

    if (isThinking || historyIndex < 0) return;

    // Undo current player's last move and the AI's response
    let undoCount = 1;

    // If it's player's turn and there's at least 2 moves, undo both
    if (engine.turn === playerColor && historyIndex >= 1) {
      undoCount = 2;
    }

    for (let i = 0; i < undoCount && historyIndex - i >= 0; i++) {
      engine.undo();
    }

    const newHistoryIndex = historyIndex - undoCount;
    const newLastMove = newHistoryIndex >= 0 ? moveHistory[newHistoryIndex] : null;

    set({
      historyIndex: newHistoryIndex,
      lastMove: newLastMove,
      selectedSquare: null,
      currentTactic: null,
      coachMessage: "Move undone! Try something different.",
      isGameOver: false,
      gameOutcome: null,
      hintSquare: null,
    });

    get().updateHighlights();
  },

  // Reset to start of game
  resetGame: () => {
    const { playerColor, skillLevel } = get();
    get().startNewGame(playerColor, skillLevel);
  },

  // Set player info
  setPlayerInfo: (name: string | null, mode: PlayerMode) => {
    const playerConfig = playerConfigs[mode];

    set({
      playerName: name,
      playerMode: mode,
      showLegalMoves: playerConfig.showLegalMovesDefault,
      showDanger: playerConfig.showDangerDefault,
    });
  },

  // Toggle legal moves display
  toggleLegalMoves: () => {
    set((state) => ({ showLegalMoves: !state.showLegalMoves }));
    get().updateHighlights();
  },

  // Toggle danger display
  toggleDanger: () => {
    set((state) => ({ showDanger: !state.showDanger }));
    get().updateHighlights();
  },

  // Dismiss tactic celebration
  dismissTactic: () => {
    set({ currentTactic: null });
  },

  // Cancel promotion dialog
  cancelPromotion: () => {
    set({ pendingPromotion: null, selectedSquare: null });
    get().updateHighlights();
  },

  // Update highlights based on current state
  updateHighlights: () => {
    const {
      engine,
      selectedSquare,
      playerColor,
      showLegalMoves,
      showDanger,
      lastMove,
      currentTactic,
      hintSquare,
    } = get();

    const highlights = calculateHighlights(engine, {
      selectedSquare,
      playerColor,
      showLegalMoves,
      showDanger,
      lastMove,
      currentTactic,
      hintSquare,
    });

    set({ highlights });
  },

  // Update piece statuses (danger indicators, abandonment warnings)
  updatePieceStatuses: () => {
    const { engine, selectedSquare, playerColor, showDanger } = get();
    const statuses = new Map<Square, PieceVisualStatus>();

    // Only show piece statuses if showDanger is enabled
    if (!showDanger) {
      set({ pieceStatuses: statuses });
      return;
    }

    // Get current danger status for all player's pieces
    const currentStatuses = getPieceStatuses(engine, playerColor);
    for (const [square, status] of currentStatuses) {
      if (status.status === 'hanging') {
        statuses.set(square, 'hanging');
      } else if (status.status === 'threatened') {
        statuses.set(square, 'threatened');
      }
    }

    // Add abandonment warnings when a piece is selected
    if (selectedSquare) {
      const warnings = findAbandonmentWarnings(engine, selectedSquare, playerColor);
      for (const warning of warnings) {
        // Only show wouldAbandon if piece isn't already hanging
        if (statuses.get(warning.abandonedSquare) !== 'hanging') {
          statuses.set(warning.abandonedSquare, 'wouldAbandon');
        }
      }
    }

    set({ pieceStatuses: statuses });
  },
}));
