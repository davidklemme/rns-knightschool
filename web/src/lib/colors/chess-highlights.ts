import { ChessEngine } from '@/lib/chess/engine';
import { analyzeDanger, getDangerSquares } from '@/lib/chess/danger';
import { analyzeAllMoves } from '@/lib/chess/move-safety';
import type { Square, Color, HighlightType, HighlightMap, TacticResult, ChessMove, MoveSafetyInfo } from '@/lib/chess/types';
import type { TeachingHint } from '@/lib/chess/hints';

/**
 * Highlight calculation functions for RnS KnightSchool
 *
 * These functions calculate which squares should be highlighted
 * based on game state and user interactions.
 */

// --- Highlight rule system ---

type HighlightRule = {
  condition: (safety: MoveSafetyInfo, isCapture: boolean) => boolean;
  highlight: HighlightType;
};

// Rules are evaluated in order - first match wins.
// materialRisk covers both undefended destinations and losing trades onto
// defended squares (e.g. queen takes a pawn that is protected).
const MOVE_HIGHLIGHT_RULES: HighlightRule[] = [
  // Abandonment: green → orange gradient
  { condition: (s) => s.leavesHanging.length > 0, highlight: 'leavesHanging' },
  // Risky capture: green → red gradient (capture but we lose the trade)
  { condition: (s, cap) => cap && s.materialRisk > 0, highlight: 'riskyCapture' },
  // Risky move: green → red gradient (moving into a losing attack)
  { condition: (s, cap) => !cap && s.materialRisk > 0, highlight: 'riskyMove' },
  // Safe capture: solid green
  { condition: (_, cap) => cap, highlight: 'legalCapture' },
  // Safe move: light green
  { condition: () => true, highlight: 'legalMove' },
];

const getHighlightForMove = (safety: MoveSafetyInfo, isCapture: boolean): HighlightType => {
  for (const rule of MOVE_HIGHLIGHT_RULES) {
    if (rule.condition(safety, isCapture)) {
      return rule.highlight;
    }
  }
  return 'legalMove';
};

/**
 * Create highlight map for legal moves from a selected square
 * Now uses safety analysis for color-coded destinations
 */
export function createLegalMoveHighlights(
  engine: ChessEngine,
  selectedSquare: Square,
  playerColor?: Color
): HighlightMap {
  const highlights: HighlightMap = new Map();

  // Add selected square highlight
  highlights.set(selectedSquare, 'selected');

  // Get piece info
  const piece = engine.get(selectedSquare);
  if (!piece) return highlights;

  // Use player color if provided, otherwise infer from piece
  const color = playerColor ?? piece.color;

  // Get safety analysis for all moves from this square
  const safetyMap = analyzeAllMoves(engine, selectedSquare, color);

  // Get legal moves
  const moves = engine.getLegalMoves(selectedSquare);

  for (const move of moves) {
    const targetPiece = engine.get(move.to);
    const isCapture = targetPiece !== null;
    const safety = safetyMap.get(move.to);

    if (safety) {
      highlights.set(move.to, getHighlightForMove(safety, isCapture));
    } else {
      // Fallback if no safety info (shouldn't happen)
      highlights.set(move.to, isCapture ? 'legalCapture' : 'legalMove');
    }
  }

  return highlights;
}

/**
 * Create highlight map for danger indicators
 */
export function createDangerHighlights(
  engine: ChessEngine,
  color: Color
): HighlightMap {
  const highlights: HighlightMap = new Map();
  const dangerSquares = getDangerSquares(engine, color);

  for (const square of dangerSquares) {
    const analysis = analyzeDanger(engine, color);
    if (analysis.isInCheck && square === engine.getKingSquare(color)) {
      highlights.set(square, 'inCheck');
    } else {
      highlights.set(square, 'danger');
    }
  }

  return highlights;
}

/**
 * Create highlight map for a detected tactic
 */
export function createTacticHighlights(tactic: TacticResult): HighlightMap {
  const highlights: HighlightMap = new Map();

  // Highlight the source square (where the piece moved to)
  highlights.set(tactic.move.to, 'tacticSource');

  // Highlight target squares
  for (const target of tactic.targets) {
    highlights.set(target, 'tacticTarget');
  }

  return highlights;
}

/**
 * Create highlight map for last move
 */
export function createLastMoveHighlights(move: ChessMove | null): HighlightMap {
  const highlights: HighlightMap = new Map();

  if (move) {
    highlights.set(move.from, 'lastMoveFrom');
    highlights.set(move.to, 'lastMoveTo');
  }

  return highlights;
}

/**
 * Create highlight map for a teaching hint.
 *
 * Shows the whole idea, not just the piece: the piece to move and its
 * destination glow purple, and the squares the move impacts (fork targets,
 * the piece being rescued, the enemy king...) glow yellow - the color
 * language for "look at these together".
 */
export function createHintHighlight(hint: TeachingHint): HighlightMap {
  const highlights: HighlightMap = new Map();
  for (const square of hint.impactSquares) {
    highlights.set(square, 'tacticTarget');
  }
  highlights.set(hint.from, 'hint');
  highlights.set(hint.to, 'hint');
  return highlights;
}

/**
 * Merge multiple highlight maps with priority
 *
 * Later maps have higher priority (overwrite earlier ones),
 * except for certain types that always win (inCheck, selected, tacticSource)
 */
export function mergeHighlights(...maps: HighlightMap[]): HighlightMap {
  const merged: HighlightMap = new Map();
  const priorityTypes: HighlightType[] = ['inCheck', 'selected', 'tacticSource'];

  // Process maps in order
  for (const map of maps) {
    for (const [square, type] of map) {
      const existing = merged.get(square);

      // Priority types always win
      if (existing && priorityTypes.includes(existing)) {
        continue;
      }

      // New priority type always overwrites
      if (priorityTypes.includes(type)) {
        merged.set(square, type);
        continue;
      }

      // Otherwise, later maps overwrite
      merged.set(square, type);
    }
  }

  return merged;
}

/**
 * Calculate all highlights for the current game state
 */
export interface HighlightOptions {
  selectedSquare: Square | null;
  playerColor: Color;
  showLegalMoves: boolean;
  showDanger: boolean;
  lastMove: ChessMove | null;
  currentTactic: TacticResult | null;
  hint: TeachingHint | null;
}

export function calculateHighlights(
  engine: ChessEngine,
  options: HighlightOptions
): HighlightMap {
  const maps: HighlightMap[] = [];

  // Last move (lowest priority)
  if (options.lastMove) {
    maps.push(createLastMoveHighlights(options.lastMove));
  }

  // Danger highlights
  if (options.showDanger) {
    maps.push(createDangerHighlights(engine, options.playerColor));
  }

  // Legal move highlights
  if (options.showLegalMoves && options.selectedSquare) {
    const piece = engine.get(options.selectedSquare);
    // Only show legal moves for player's pieces
    if (piece && piece.color === options.playerColor) {
      maps.push(createLegalMoveHighlights(engine, options.selectedSquare, options.playerColor));
    }
  }

  // Selected square (even without legal moves showing)
  if (options.selectedSquare) {
    const selectedMap: HighlightMap = new Map();
    selectedMap.set(options.selectedSquare, 'selected');
    maps.push(selectedMap);
  }

  // Hint
  if (options.hint) {
    maps.push(createHintHighlight(options.hint));
  }

  // Tactic highlights (highest priority except for inCheck)
  if (options.currentTactic) {
    maps.push(createTacticHighlights(options.currentTactic));
  }

  return mergeHighlights(...maps);
}

/**
 * Get highlight type for a specific square from a highlight map
 */
export function getSquareHighlight(
  highlights: HighlightMap,
  square: Square
): HighlightType {
  return highlights.get(square) || 'none';
}
