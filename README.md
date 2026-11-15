# RnS KnightSchool

A visual chess practice app for children and parents. Play full games against Stockfish, choose a descriptive difficulty, and turn teaching helpers on or off independently.

- Tap a piece for legal moves, capture cues, and immediate material-risk warnings.
- Ask for a concept-based hint: rescue, capture/trade, fork, pin, skewer, discovered attack, development, or checkmate.
- Tactical celebrations remain beside the board until acknowledged; the opponent waits while the child reads or listens.
- Color cues also have symbols and accessible descriptions. Coach feedback supports optional browser read-aloud and reduced motion.
- Undo is available after game end. Finish game records a resignation and allows another try.
- Evaluation and move-by-move review live under Advanced / grown-ups.
- Engine errors preserve the position and offer Retry computer instead of silently changing strength.

## Run locally

Requires Node 22+ and npm.

```sh
cd web
npm ci
npm run dev
```

Open http://localhost:3000. Choose a player and color, then tap a piece.

```sh
npm run test:run
npm run lint
npx tsc --noEmit
npm run build
npm start
```

The app uses Next.js, React, TypeScript, chess.js, Zustand, Tailwind, and bundled Stockfish WASM workers. COOP/COEP headers enable the multi-thread worker; a single-thread worker is used when isolation is unavailable or multi-thread startup fails. Serve both JS and WASM files from `web/public/stockfish` with the app. Stockfish's license is included there.

## Teaching and strength

Green means no immediate material loss was found in a local exchange, not guaranteed safety from every tactic. Orange warns that another piece could become exposed, red marks danger, yellow connects tactical pieces, purple suggests a move, and blue/ghost pieces track the last move. Hints use legal capture sequences including pinned defenders and promotions; they do not replace full engine analysis.

The beginner settings use shallow Stockfish search plus deliberate opportunities to capture a pawn or minor piece. Stronger settings use Stockfish's Elo limiter. Internal Elo targets are configuration values, not independently measured human ratings; numeric ratings and chess title claims are not shown to children. Statistical calibration, real-device Safari testing, and sessions with children remain validation work.

Read-aloud uses the browser speech API when available. No speech service or account is required by this app; available voices and synthesis behavior depend on the browser/device.

See [review and remediation notes](docs/CHESS-APP-REVIEW.md) and the [original product brief](docs/RnS-KnightSchool-PRD.md).
