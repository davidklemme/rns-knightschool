import type { Square as ChessSquare, Color as ChessColor, PieceSymbol } from 'chess.js';

// Re-export chess.js types for convenience
export type Square = ChessSquare;
export type PieceType = PieceSymbol;
export type Color = ChessColor;

// Skill levels for the AI opponent
export type SkillLevel = 'learning' | 'better' | 'challenge' | 'tough';

// Configuration for each skill level
export interface SkillConfig {
  level: SkillLevel;
  elo: number;
  depth: number;
  showLegalMoves: boolean;
  showDanger: boolean;
  aiMistakeRate: number; // 0-1, chance AI misses best move
  label: string;
  description: string;
}

// Predefined skill configurations
export const SKILL_CONFIGS: Record<SkillLevel, SkillConfig> = {
  learning: {
    level: 'learning',
    elo: 400,
    depth: 5,
    showLegalMoves: true,
    showDanger: true,
    aiMistakeRate: 0.4,
    label: 'Learning',
    description: 'All helpers on, friendly AI',
  },
  better: {
    level: 'better',
    elo: 600,
    depth: 8,
    showLegalMoves: true,
    showDanger: true,
    aiMistakeRate: 0.25,
    label: 'Getting Better',
    description: 'Helpers on, smarter AI',
  },
  challenge: {
    level: 'challenge',
    elo: 800,
    depth: 10,
    showLegalMoves: false,
    showDanger: true,
    aiMistakeRate: 0.15,
    label: 'Challenge',
    description: 'Legal moves hidden, skilled AI',
  },
  tough: {
    level: 'tough',
    elo: 1000,
    depth: 12,
    showLegalMoves: false,
    showDanger: false,
    aiMistakeRate: 0.05,
    label: 'Tough',
    description: 'No helpers, strong AI',
  },
};

// Piece value for material calculation
export const PIECE_VALUES: Record<PieceType, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0, // King has infinite value but 0 for material counting
};

// Move representation
export interface ChessMove {
  from: Square;
  to: Square;
  piece: PieceType;
  captured?: PieceType;
  promotion?: PieceType;
  san: string; // Standard algebraic notation
  flags: string;
}

// Board position with piece info
export interface PiecePosition {
  square: Square;
  type: PieceType;
  color: Color;
}

// Threat information for a piece
export interface ThreatInfo {
  square: Square;
  piece: PieceType;
  color: Color;
  attackers: Square[];
  defenders: Square[];
  isHanging: boolean;
  isThreatened: boolean;
}

// Tactic types we detect
export type TacticType = 'fork' | 'pin' | 'skewer' | 'discovered_attack' | 'check' | 'checkmate';

// Result of tactic detection
export interface TacticResult {
  type: TacticType;
  move: ChessMove;
  targets: Square[];
  message: string;
  celebrationEmoji: string;
}

// Highlight types for squares
export type HighlightType =
  | 'none'
  | 'selected'
  | 'legalMove'
  | 'legalCapture'
  | 'riskyMove'        // Moving here would put piece under attack
  | 'riskyCapture'     // Capture but piece would be recaptured
  | 'leavesHanging'    // Moving would leave another piece hanging
  | 'danger'
  | 'inCheck'
  | 'tacticSource'
  | 'tacticTarget'
  | 'lastMoveFrom'
  | 'lastMoveTo'
  | 'hint';

// Map of square to highlight type
export type HighlightMap = Map<Square, HighlightType>;

// Player mode configuration
export type PlayerMode = 'ruby' | 'sammy';

export interface PlayerConfig {
  mode: PlayerMode;
  defaultSkillLevel: SkillLevel;
  showLegalMovesDefault: boolean;
  showDangerDefault: boolean;
  celebrateTactics: boolean;
  simpleMessages: boolean;
}

export const PLAYER_CONFIGS: Record<PlayerMode, PlayerConfig> = {
  ruby: {
    mode: 'ruby',
    defaultSkillLevel: 'learning',
    showLegalMovesDefault: true,
    showDangerDefault: true,
    celebrateTactics: true,
    simpleMessages: true,
  },
  sammy: {
    mode: 'sammy',
    defaultSkillLevel: 'challenge',
    showLegalMovesDefault: false,
    showDangerDefault: true,
    celebrateTactics: true,
    simpleMessages: false,
  },
};

// Game outcome
export type GameOutcome = 'checkmate' | 'stalemate' | 'draw' | 'resignation' | null;

// Game state snapshot for history
export interface GameSnapshot {
  fen: string;
  move: ChessMove | null;
  timestamp: number;
}

// Move safety analysis result
export interface MoveSafetyInfo {
  from: Square;
  to: Square;
  isSafe: boolean;              // Destination not attacked
  isRisky: boolean;             // Destination IS attacked
  wouldBeDefended: boolean;     // Would have defenders at dest
  leavesHanging: Square[];      // Our pieces that become hanging
  materialRisk: number;         // Net material loss risk
}

// Piece status for visual indicators
export interface PieceStatus {
  square: Square;
  status: 'safe' | 'threatened' | 'hanging';
  attackers: Square[];
  defenders: Square[];
}

export type PieceStatusMap = Map<Square, PieceStatus>;
export type PieceVisualStatus = 'none' | 'hanging' | 'threatened' | 'wouldAbandon';

// Abandonment warning for lookahead analysis
export interface AbandonmentWarning {
  abandonedSquare: Square;
  pieceType: PieceType;
  defenderSquare: Square;  // The piece that was defending it (being moved)
}
