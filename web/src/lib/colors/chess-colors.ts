import type { HighlightType } from '@/lib/chess/types';

/**
 * Chess square highlight styles
 *
 * Philosophy: Clear, bright colors that kids can understand at a glance.
 * Green = safe, Yellow = caution, Red = danger
 */

export const CHESS_HIGHLIGHTS: Record<HighlightType, string> = {
  none: '',
  selected: 'ring-4 ring-blue-500 bg-blue-300/70',
  legalMove: '',  // Uses dot indicator instead
  legalCapture: 'ring-2 ring-green-500',
  riskyMove: '',  // Uses dot indicator instead
  riskyCapture: 'ring-2 ring-red-500',
  leavesHanging: '',  // Uses dot indicator instead
  danger: 'ring-2 ring-red-500 animate-danger-pulse',
  inCheck: 'bg-red-500/80 ring-4 ring-red-600 animate-check-pulse',
  tacticSource: 'bg-yellow-400/70 ring-2 ring-yellow-500 animate-tactic-sparkle',
  tacticTarget: 'bg-yellow-300/60 ring-2 ring-yellow-400',
  lastMoveFrom: 'bg-blue-300/50 animate-last-move-pulse',
  lastMoveTo: 'bg-blue-400/60 animate-last-move-pulse',
  hint: 'bg-purple-400/60 ring-2 ring-purple-500 animate-gentle-pulse',
};

/**
 * Color legend for teaching panel
 */
export interface LegendItem {
  color: string;
  bgColor: string;
  label: string;
  description: string;
}

export const CHESS_COLOR_LEGEND: LegendItem[] = [
  {
    color: 'bg-green-500',
    bgColor: 'bg-green-500/60',
    label: 'Safe move!',
    description: 'Green dot means safe place to move',
  },
  {
    color: 'bg-green-600',
    bgColor: 'ring-2 ring-green-500',
    label: 'Can capture!',
    description: 'Green ring means you can take a piece safely',
  },
  {
    color: 'bg-red-500',
    bgColor: 'bg-red-500/70',
    label: 'Risky move!',
    description: 'Red dot means your piece could be captured there',
  },
  {
    color: 'bg-orange-500',
    bgColor: 'bg-orange-500/70',
    label: 'Leaves piece!',
    description: 'Orange dot means moving would leave another piece unprotected',
  },
  {
    color: 'bg-red-400',
    bgColor: 'ring-2 ring-red-500',
    label: 'In danger!',
    description: 'Red ring means your piece is being attacked',
  },
  {
    color: 'bg-yellow-400',
    bgColor: 'bg-yellow-400/70',
    label: 'Super move!',
    description: 'Yellow highlights special tactical moves',
  },
  {
    color: 'bg-purple-400',
    bgColor: 'bg-purple-400/60',
    label: 'Hint!',
    description: "Purple shows the coach's suggested move",
  },
  {
    color: 'bg-blue-400',
    bgColor: 'bg-blue-400/60',
    label: 'Last move!',
    description: 'Blue shows the move that was just played - the grey piece marks where it came from',
  },
];

/**
 * Simplified legend for Ruby (younger player) mode
 */
export const CHESS_COLOR_LEGEND_SIMPLE: LegendItem[] = [
  {
    color: 'bg-green-500',
    bgColor: 'bg-green-500/60',
    label: 'Go here!',
    description: 'Safe to move',
  },
  {
    color: 'bg-red-500',
    bgColor: 'bg-red-500/70',
    label: 'Be careful!',
    description: 'Could lose piece',
  },
  {
    color: 'bg-orange-500',
    bgColor: 'bg-orange-500/70',
    label: 'Watch out!',
    description: 'Leaves piece',
  },
  {
    color: 'bg-yellow-400',
    bgColor: 'bg-yellow-400/70',
    label: 'Great move!',
    description: 'Special move',
  },
];

/**
 * Board square base colors (light and dark)
 */
export const BOARD_COLORS = {
  light: '#f0d9b5',
  dark: '#b58863',
  lightHover: '#e8d1a8',
  darkHover: '#a67b58',
};

/**
 * Piece colors
 */
export const PIECE_COLORS = {
  white: {
    fill: '#ffffff',
    stroke: '#333333',
  },
  black: {
    fill: '#333333',
    stroke: '#000000',
  },
};

/**
 * Animation durations (in seconds)
 */
export const ANIMATION_DURATIONS = {
  pieceMove: 0.4,      // Longer duration for piece movement
  pieceBounce: 0.5,
  highlight: 0.15,
  celebration: 3,
};

/**
 * Get the CSS class for a highlight type
 */
export const getHighlightClass = (type: HighlightType): string =>
  CHESS_HIGHLIGHTS[type];

/**
 * Combine multiple highlight types (priority-based)
 */
const HIGHLIGHT_PRIORITY: HighlightType[] = [
  'inCheck',
  'selected',
  'tacticSource',
  'tacticTarget',
  'danger',
  'hint',
  'riskyCapture',
  'riskyMove',
  'leavesHanging',
  'legalCapture',
  'legalMove',
  'lastMoveTo',
  'lastMoveFrom',
  'none',
];

export const combineHighlights = (...types: HighlightType[]): HighlightType =>
  HIGHLIGHT_PRIORITY.find((p) => types.includes(p)) ?? 'none';
