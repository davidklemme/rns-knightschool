import type { Square as ChessSquare, Color as ChessColor, PieceSymbol } from 'chess.js';

// Re-export chess.js types for convenience
export type Square = ChessSquare;
export type PieceType = PieceSymbol;
export type Color = ChessColor;

// Skill levels for the AI opponent
export type SkillLevel =
  | 'learning'
  | 'better'
  | 'challenge'
  | 'tough'
  | 'advanced'
  | 'strong'
  | 'expert'
  | 'master'
  | 'grandmaster';

// Configuration for each skill level
export interface SkillConfig {
  level: SkillLevel;
  elo: number;
  depth: number;
  showLegalMoves: boolean;
  showDanger: boolean;
  aiMistakeRate: number; // 0-1, chance AI makes a random move instead of best
  label: string;
  description: string;
  stockfishSkillLevel: number; // 0-20 Stockfish skill level
  useMultiThreaded: boolean; // true = multi-threaded engine, false = single-threaded
}

// Predefined skill configurations
// Stockfish's UCI_Elo range is 1320-3190. For sub-1320 ELOs we inject random moves.
// For 1320+, Stockfish handles its own strength limiting.
export const SKILL_CONFIGS: Record<SkillLevel, SkillConfig> = {
  learning: {
    level: 'learning',
    elo: 400,
    depth: 4,
    showLegalMoves: true,
    showDanger: true,
    aiMistakeRate: 0.6, // 60% random moves for very weak play
    label: 'Learning',
    description: 'All helpers on, friendly AI',
    stockfishSkillLevel: 0,
    useMultiThreaded: false,
  },
  better: {
    level: 'better',
    elo: 600,
    depth: 5,
    showLegalMoves: true,
    showDanger: true,
    aiMistakeRate: 0.45, // 45% random moves
    label: 'Getting Better',
    description: 'Helpers on, smarter AI',
    stockfishSkillLevel: 0,
    useMultiThreaded: false,
  },
  challenge: {
    level: 'challenge',
    elo: 800,
    depth: 6,
    showLegalMoves: false,
    showDanger: true,
    aiMistakeRate: 0.35, // 35% random moves
    label: 'Challenge',
    description: 'Legal moves hidden, skilled AI',
    stockfishSkillLevel: 0,
    useMultiThreaded: false,
  },
  tough: {
    level: 'tough',
    elo: 1000,
    depth: 8,
    showLegalMoves: false,
    showDanger: false,
    aiMistakeRate: 0.25, // 25% random moves
    label: 'Tough',
    description: 'No helpers, strong AI',
    stockfishSkillLevel: 0,
    useMultiThreaded: false,
  },
  advanced: {
    level: 'advanced',
    elo: 1200,
    depth: 10,
    showLegalMoves: false,
    showDanger: false,
    aiMistakeRate: 0.12, // 12% random moves (still below Stockfish minimum)
    label: 'Advanced',
    description: 'Experienced player level',
    stockfishSkillLevel: 0,
    useMultiThreaded: false,
  },
  strong: {
    level: 'strong',
    elo: 1320,
    depth: 15,
    showLegalMoves: false,
    showDanger: false,
    aiMistakeRate: 0.0, // Stockfish at minimum ELO - no artificial weakening
    label: 'Strong',
    description: 'Club player level',
    stockfishSkillLevel: 0,
    useMultiThreaded: true,
  },
  expert: {
    level: 'expert',
    elo: 1500,
    depth: 18,
    showLegalMoves: false,
    showDanger: false,
    aiMistakeRate: 0.0,
    label: 'Expert',
    description: 'Tournament player level',
    stockfishSkillLevel: 5,
    useMultiThreaded: true,
  },
  master: {
    level: 'master',
    elo: 1800,
    depth: 20,
    showLegalMoves: false,
    showDanger: false,
    aiMistakeRate: 0.0,
    label: 'Master',
    description: 'Master level opponent',
    stockfishSkillLevel: 10,
    useMultiThreaded: true,
  },
  grandmaster: {
    level: 'grandmaster',
    elo: 2500,
    depth: 22,
    showLegalMoves: false,
    showDanger: false,
    aiMistakeRate: 0.0,
    label: 'Grandmaster',
    description: 'Elite level challenge',
    stockfishSkillLevel: 20,
    useMultiThreaded: true,
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
