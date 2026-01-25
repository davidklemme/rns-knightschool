# RnS KnightSchool - Product Requirements Document

> **Ruben and Sammy's Knight School** - A visual-learning Chess app for kids 5+

## 1. Product Vision

### What We're Building
A chess learning app that teaches through **color-coded visual hints** rather than engine analysis arrows. The app respects the child's agency - showing less, not more. Full games against a "training wheels" AI that creates learning opportunities organically.

### Target Audience
- **Primary:** Children ages 5-12
- **Named for:** Ruby (5) and Sammy (older)
- **Key insight:** Kids learn visually before they read fluently. Traditional chess apps overwhelm with analysis.

### Core Differentiator
**The "Anti-Stockfish" philosophy** - No cluttered analysis arrows. No engine evaluations. No intimidating notation. The board itself becomes the teaching surface through color. When Ruby accidentally creates a fork, the app celebrates it without lecturing.

### Lineage
Direct port of the RnS SuDoCoach visual teaching approach:
- Same color-as-language system
- Same progressive disclosure philosophy
- Same "grid/board is hero" UI principle
- Same celebration-not-perfection tone

---

## 2. Design Principles

### 2.1 Board is the Hero
- The chess board dominates the screen (60-70% of viewport)
- Large, tappable squares (minimum 44px touch targets)
- All teaching happens ON the board through color
- No analysis arrows or engine lines

### 2.2 Show Less, Not More
- Traditional chess apps overwhelm with information
- We show only what's immediately relevant
- Helpers available on-demand, never forced
- Progressive disclosure - features fade as confidence grows

### 2.3 No Pressure
- No clock by default
- No ELO ratings
- Losses are learning moments, not failures
- Celebration of clever moves, not just wins

### 2.4 Training Wheels AI
- AI opponent designed to create learning opportunities
- Makes "believable mistakes" that kids can exploit
- Never feels like it's "letting you win"
- Adjustable difficulty that grows with the player

---

## 3. Color Strategy System

### 3.1 Core Color Language (Ported from SuDoCoach)

| Color | Meaning | Chess Use Case |
|-------|---------|----------------|
| Green glow | "You can go here safely!" | Legal moves, safe squares |
| Yellow highlight | "Look at these together" | Pieces working together, tactical patterns |
| Blue tint | "Pay attention here" | Interesting area, recent activity |
| Purple accent | "These are connected" | Pieces protecting each other |
| Red glow | "Danger!" | Piece is attacked, threatened square |
| White/Default | Normal state | No hint active |

### 3.2 Color Application Rules

```
Priority (highest to lowest):
1. Danger (red) - always show threats immediately
2. Legal moves (green) - when piece selected
3. Tactical highlight (yellow) - fork/pin/skewer detected
4. Selection (light blue ring) - user's current focus
5. Last move (subtle gray) - where opponent just moved
```

### 3.3 Animation Guidelines

- **Green safe square:** Subtle pulse when considering a move
- **Red danger:** Gentle throb on threatened pieces
- **Yellow tactical:** Synchronized pulse on related pieces
- **Capture available:** Target piece has ring animation
- **Checkmate:** Celebration ripple from king

---

## 4. Feature Specification

### 4.1 Core Features (MVP)

#### Move Assistance
- **"Where can I go?"** - Tap ANY piece to see legal moves (green squares)
- **Move ghosts** - Picked-up piece shows translucent landing options
- **Gentle corrections** - Illegal moves don't register; piece returns with soft wobble
- **No notation required** - Everything is visual

#### Danger Detection
- **Threatened pieces glow red** - Always visible, toggleable
- **Safe squares highlighted** - When moving, see what's safe
- **Capture opportunities** - Opponent's vulnerable pieces subtly marked

#### Tactical Celebration
- **Pattern recognition** - Detect forks, pins, skewers, discovered attacks
- **Celebrate accidents** - "Your knight is being SO sneaky - it's attacking TWO pieces!"
- **Badge system** - Collect tactical achievements
- **Friendly language** - "Fork" becomes "your knight is causing mischief!"

#### AI Opponent
- **Training wheels mode** - AI creates learning opportunities
- **Adjustable strength** - From "learning together" to "real challenge"
- **Believable play** - Never feels like it's throwing the game
- **Teaching mistakes** - Occasionally leaves tactics for child to find

#### Clean UI
- **Board-centric** - 70%+ of screen is the chess board
- **Minimal chrome** - No distracting sidebars
- **SuDoCoach aesthetic** - Same warm, encouraging visual language

### 4.2 Phase 2 Features (Post-MVP)

#### If-Then Consequence Coloring
- **Tap and hold** - See your moves (green)
- **Hold longer** - Squares change to show opponent responses:
  - Light red = "if you go here, they can take you"
  - Bright green = "safe AND strong!"
  - Yellow = "something interesting could happen"

#### Post-Game Review
- **Interesting moments** - "Remember when your bishop did this?"
- **Missed opportunities** - Gentle, not critical
- **Tactical recap** - Celebrate what they found

#### Progression System
- **Tactical badges** - Fork Finder, Pin Master, etc.
- **Piece confidence** - Track comfort with each piece type
- **Suggested challenges** - "Ready to try using the knight more?"

### 4.3 Intentionally NOT Building

- Opening book training (memorization isn't fun)
- Endgame tablebase drilling (too advanced)
- Online multiplayer (safety concerns, complexity)
- ELO ratings (pressure, not learning)
- Move notation display (intimidating)
- Full engine analysis (overwhelming)
- Timed games by default (stress)

---

## 5. User Experience by Skill Level

### 5.1 Ruby Mode (Age 5, Learning Pieces)

```
Features ON by default:
├── "Where can I go?" - always available
├── Legal move highlighting - automatic on piece touch
├── Danger glow - pieces under attack
├── Piece movement hints - "Knights jump in an L!"
└── AI strength - Very Easy (ELO ~400)

Features OFF by default:
├── If-then coloring - too complex
├── Tactical detection - focus on basics first
└── Post-game review - just play!
```

**Experience goal:** Ruby understands how pieces move through play, not instruction. She accidentally checkmates and is delighted.

### 5.2 Sammy Mode (Older, Confident)

```
Features ON by default:
├── Danger glow - pieces under attack
├── Tactical celebration - forks, pins, etc.
├── If-then coloring - see consequences
└── AI strength - Easy/Medium (ELO ~600-800)

Features OPTIONAL:
├── "Where can I go?" - can toggle off
├── Movement hints - probably doesn't need
└── Post-game review - when requested
```

**Experience goal:** Sammy develops tactical sight. She starts seeing forks before making them.

### 5.3 No Explicit "Modes"

The UI doesn't say "Beginner Mode" - that's patronizing. Instead:
- Settings toggles: "Show safe squares" / "Show what happens next"
- Kids self-select their training wheels
- Features naturally fade as unused

---

## 6. Layout Specification

### 6.1 Single-Screen Philosophy
One screen. Everything visible. No page navigation during play.

### 6.2 Desktop Layout (>=768px)

```
┌──────────────────────────────────────────────────────────────┐
│  ♞ RnS KnightSchool                              [⚙️ Settings]│
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────┐  ┌─────────────────────────┐ │
│  │                            │  │  🎓 Coach Zone          │ │
│  │                            │  │                         │ │
│  │                            │  │  [Color legend]         │ │
│  │      CHESS BOARD           │  │                         │ │
│  │      (8x8, aspect-square)  │  │  [Current hint/praise]  │ │
│  │                            │  │                         │ │
│  │                            │  │  [Captured pieces]      │ │
│  │                            │  │                         │ │
│  └────────────────────────────┘  └─────────────────────────┘ │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│    [↩️ Undo]  [💡 Hint]  [🏳️ Resign]  [🔄 New Game]          │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 6.3 Mobile Layout (<768px)

```
┌────────────────────────────┐
│ ♞ KnightSchool        ⚙️   │  48px
├────────────────────────────┤
│                            │
│                            │
│       CHESS BOARD          │  flex-1 (dominant)
│       (max-w, centered)    │
│                            │
│                            │
├────────────────────────────┤
│ 🎓 Coach (compact)         │  60-80px
│ [hint message] [captures]  │
├────────────────────────────┤
│ [↩️][💡][🏳️][🔄]           │  ~60px
└────────────────────────────┘
```

---

## 7. Technical Architecture

### 7.1 Tech Stack

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Framework | Next.js 16+ (App Router) | Same as SuDoCoach, code reuse |
| State | Zustand | Same as SuDoCoach, proven pattern |
| Styling | Tailwind CSS | Same as SuDoCoach |
| Chess Logic | chess.js | MIT license, handles all rules |
| AI Engine | stockfish.wasm | GPL, runs in browser |
| UI Components | shadcn/ui | Same as SuDoCoach |

### 7.2 Directory Structure

```
knightschool-web/
├── app/
│   ├── layout.tsx              # Root with metadata
│   ├── page.tsx                # Landing/home
│   ├── play/
│   │   └── page.tsx            # Game page
│   └── globals.css             # Tailwind + custom props
│
├── components/
│   ├── ui/                     # shadcn/ui base components
│   │
│   ├── layout/
│   │   ├── GameShell.tsx       # Main layout container
│   │   └── Header.tsx          # Top bar
│   │
│   ├── chess/                  # Core game components
│   │   ├── Board.tsx           # The chess board
│   │   ├── Square.tsx          # Individual square
│   │   ├── Piece.tsx           # Chess piece rendering
│   │   ├── MoveIndicator.tsx   # Legal move dots/rings
│   │   └── CapturedPieces.tsx  # Show taken pieces
│   │
│   └── coach/                  # Teaching components
│       ├── CoachZone.tsx       # Main teaching area
│       ├── ColorLegend.tsx     # What colors mean
│       ├── TacticalBadge.tsx   # Fork/pin celebration
│       └── Celebration.tsx     # Win animations
│
├── lib/
│   ├── chess/
│   │   ├── engine.ts           # Stockfish wrapper
│   │   ├── tactics.ts          # Tactical pattern detection
│   │   ├── threats.ts          # Threat/danger calculation
│   │   └── teaching-ai.ts      # Training wheels AI logic
│   │
│   └── colors/                 # Ported from SuDoCoach
│       ├── square-colors.ts    # Color mappings
│       ├── highlights.ts       # Square highlight logic
│       └── animations.ts       # Animation utilities
│
├── store/
│   └── gameStore.ts            # Zustand store
│
└── workers/
    └── stockfish.worker.ts     # Web Worker for engine
```

### 7.3 Key Technical Decisions

#### Chess.js for Rules
```typescript
import { Chess } from 'chess.js';

const game = new Chess();

// Legal move generation
const moves = game.moves({ square: 'e2', verbose: true });

// Move validation
const result = game.move({ from: 'e2', to: 'e4' });

// Game state
const isCheck = game.isCheck();
const isCheckmate = game.isCheckmate();
```

#### Stockfish.wasm for AI
```typescript
// Loaded in Web Worker to not block UI
// Throttled to appropriate skill level
// Never shows raw evaluation to user

const engine = new StockfishWorker();
engine.setSkillLevel(5); // 0-20 scale
engine.setDepth(8);      // Limit search depth

// Get move without showing evaluation
const bestMove = await engine.getBestMove(fen);
```

#### Threat Detection (No Engine Needed)
```typescript
// chess.js can detect attacks without Stockfish
function getThreatenedPieces(game: Chess): Square[] {
  const dominated by Squares: Square[] = [];
  const dominated board = game.board();

  for (const row of board) {
    for (const square of row) {
      if (square && square.color === game.turn()) {
        if (isAttacked(game, square.square, oppositeColor)) {
          threatenedSquares.push(square.square);
        }
      }
    }
  }
  return threatenedSquares;
}
```

---

## 8. Tactical Pattern Detection

### 8.1 Patterns to Detect (MVP)

| Pattern | Detection Logic | Celebration Message |
|---------|-----------------|---------------------|
| Fork | Piece attacks 2+ higher-value pieces | "Your [piece] is causing mischief!" |
| Pin | Piece attacks through enemy to more valuable piece | "Sneaky! They can't move that piece!" |
| Skewer | Like pin but valuable piece is in front | "Greedy [piece]! Attacking through!" |
| Hanging Piece | Undefended piece can be captured | "Free piece! Can you see it?" |
| Back Rank | Threat of checkmate on back rank | "Their king looks trapped..." |

### 8.2 Pattern Hierarchy

```
Tier 1 (Always Detect):
├── Hanging pieces (undefended)
├── Checks
└── Captures available

Tier 2 (When Ready):
├── Forks
├── Pins (absolute and relative)
└── Skewers

Tier 3 (Advanced):
├── Discovered attacks
├── Back rank threats
└── Trapped pieces
```

### 8.3 Detection Timing

- **After player move:** Detect if they created a tactic (celebrate!)
- **After AI move:** Detect if AI left a tactic (hint opportunity)
- **Before player moves:** Never interrupt decision-making

---

## 9. AI Personality: The Teaching Opponent

### 9.1 Philosophy
The AI should feel like a slightly clumsy older sibling - good enough to be interesting, prone to occasional oversights that create learning moments.

### 9.2 Skill Levels

| Level | ELO Range | Behavior |
|-------|-----------|----------|
| Learning Together | 300-500 | Makes obvious blunders, leaves pieces hanging |
| Getting Better | 500-700 | Occasional tactics, misses some defenses |
| Real Challenge | 700-900 | Solid play, fewer mistakes |
| Tough Cookie | 900-1200 | Strong play, good tactics |

### 9.3 Teaching Mistake Injection

```typescript
// Occasionally, the AI "forgets" to defend
function shouldMakeTeachingMistake(level: SkillLevel): boolean {
  const mistakeChance = {
    'learning': 0.4,    // 40% chance to leave tactic
    'better': 0.25,
    'challenge': 0.1,
    'tough': 0.02,
  };
  return Math.random() < mistakeChance[level];
}

// When making teaching mistake:
// 1. Find moves that leave a tactic for the player
// 2. Choose one that looks "reasonable" (not obviously bad)
// 3. This creates organic learning opportunities
```

---

## 10. Piece Personalities (For Young Learners)

### 10.1 Character Introductions

| Piece | Personality | Movement Hint |
|-------|-------------|---------------|
| King | "The important one everyone protects" | "I can only take one step at a time" |
| Queen | "The powerful one who goes anywhere" | "I can go far in any direction!" |
| Rook | "The serious tower" | "I only walk in straight lines" |
| Bishop | "The diagonal dasher" | "I slide diagonally - always on my color!" |
| Knight | "The jumpy horse who loves surprises" | "I hop in an L-shape and jump over everyone!" |
| Pawn | "The little one who dreams of becoming a Queen" | "I walk forward but capture diagonally" |

### 10.2 When to Show

- On first use of each piece type (for new players)
- When tapping piece and holding (help mode)
- In settings as a "piece guide"
- Never interrupting flow - always on-demand

---

## 11. Implementation Phases

### Phase 1: Foundation (Week 1-2)
1. Set up project with Next.js + SuDoCoach patterns
2. Integrate chess.js for game logic
3. Build basic Board + Square components
4. Implement piece rendering
5. Basic move validation and execution

### Phase 2: Teaching Layer (Week 3-4)
6. Port color system from SuDoCoach
7. Implement legal move highlighting
8. Add danger/threat detection
9. Build CoachZone component
10. Add basic AI opponent (Stockfish integration)

### Phase 3: Intelligence (Week 5-6)
11. Tactical pattern detection (forks, pins)
12. Celebration system for found tactics
13. Teaching AI personality (deliberate mistakes)
14. If-then consequence coloring (Phase 2 feature)

### Phase 4: Polish (Week 7-8)
15. Animations and transitions
16. Mobile optimization
17. Player personalization (names)
18. Settings and preferences
19. Testing with Ruby and Sammy

---

## 12. Success Metrics

### For Ruby (5 years old)
- Can tap a piece and understand where it can move
- Recognizes when her pieces are "in danger" (red)
- Feels proud when she captures a piece
- Asks to play again
- Never feels "the computer let me win"

### For Sammy (older)
- Starts recognizing tactical patterns before the celebration
- Uses if-then coloring to plan ahead
- Develops genuine chess improvement
- Finds the app fun, not "babyish"

### Technical
- Single-screen, no layout shifts
- <100ms response to touch/click
- Smooth 60fps animations
- AI move within 500ms
- Works on iPad and phones

---

## 13. Open Questions

1. **Piece set design** - Custom kid-friendly pieces or standard chess pieces?
2. **Sound effects** - Should captures/checks have audio feedback?
3. **Persistence** - Save games in progress? Track history?
4. **Multiple profiles** - Ruby and Sammy separate accounts?
5. **Tutorial mode** - Explicit tutorial or learn-by-playing only?

---

## 14. References

- RnS SuDoCoach Design Spec (same principles)
- chess.js documentation
- Stockfish WASM implementation
- ChessKid UX (what to avoid: overwhelming)
- Lichess (good: clean board, bad: too much for kids)

---

*PRD created by the KnightSchool team: Maya, Dr. Quinn, Carson, Victor, Sophia, and BMad Master*
*Based on Party Mode brainstorming session - January 2026*
