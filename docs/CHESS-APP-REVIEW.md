**Chess review and remediation — 15 November 2026**

Reviewed the repository at `2a5b2ee`, then implemented the fixes below. All changes remain local; production was not changed.

**Resolved findings**

| Review finding | Implemented resolution |
| --- | --- |
| Congratulations vanish after four seconds, with coach text replaced after half a second | Persistent inline celebration beside the board; explicit Continue; computer waits; thinking status is separate from teaching text. Danger advice remains available during the child's turn. |
| Piece warnings never reach the board; highlight backgrounds are overridden | Passed status data through the playing page, refreshed it on toggles/undo, and placed teaching tints above base square colors. Standard board colors restored: a1 dark, h1 light. |
| Defended captures described as undefended free pieces | Classify free captures separately from favorable/equal trades using immediate legal recaptures and local exchange sequences. Removed the “nobody protecting it” inference. |
| False pins through blockers | Scan complete rays and stop at occupied squares. A pin needs two enemy pieces in order with the more valuable one behind. Includes relative pins, with appropriately qualified text. |
| Skewers missed across empty squares | Scan to the first two occupied squares along each attack ray. Handle king-front and queen-front skewers. |
| Discovered attacks declared but not implemented | Compare the position before/after the move and highlight a newly uncovered attack from a stationary sliding piece. Used by live feedback, hints, and game-review explanations. |
| “Safe” promises unsupported by the calculation | Replaced blanket guarantees with local-risk language. Forced risky moves are acknowledged; least-risk candidates are preferred. Legal exchange calculations account for pins, x-rays, king safety, promotions, and en passant. This remains local analysis, not a proof against all tactics. |
| Engine failures silently change strong opponents into random players | No random failure fallback. Preserve the position, clear thinking, explain the interruption, and expose Retry computer. Intentional beginner opportunities return an actual legal move and are distinct from failure. |
| Late search replies can resolve the next request | Terminate and detach an unresponsive worker before releasing the queue. Worker identity guards reject old events; termination settles active requests. Failed multi-thread startup is remembered so the single-thread fallback is reused. |
| Old asynchronous results can change a new game | Guard AI moves and evaluation updates against changed game/position; scope game-review cancellation to a generation. Prevent duplicate AI searches. |
| Occupied abandonment-capture destinations have no marker | Orange ring and warning symbol on occupied destinations as well as warnings on exposed pieces. En passant captures are also recognized as captures. |
| Compact controls lack accessible names | Explicit names and pressed states, labeled square color/piece/status, coaching live regions, visible thinking status, and optional Listen buttons. |
| Landscape hides difficulty/new-game controls; resize state is stale | Header remains available in every orientation; compact mode subscribes to media-query changes. Board and controls have at least 44 px targets, using a contained board scroller on narrow screens instead of shrinking squares. |
| Younger player's legend omits hint/last-move colors | Added purple-hint and blue-last-move entries; warnings, hints, and tactical targets also have symbols. |
| Repeated animations ignore motion preferences | CSS reduced-motion overrides and Framer Motion's user preference support. Celebrations no longer obscure the board with animated modal confetti. |
| Harder difficulty automatically removes helpers | Keep helper preferences independent of opponent level, including reset of the current game. Player selection sets age/mode defaults. |
| Exact ratings and chess titles imply calibrated human strength | Removed numeric ratings from the child-facing selector and changed title-like level labels to descriptive strength names. Documented internal targets as uncalibrated configuration. Advanced evaluation/review are behind grown-up controls. |
| Random beginner mistakes do not deliberately teach | Offer legal pawn/minor-piece capture opportunities when available, without exposing another piece; otherwise use configured Stockfish play. This is a teaching bias, not a full curriculum. |
| Undo disabled at game end; finish/resign does not record an outcome | Enable Undo after checkmate/draw/finish; record a resignation on Finish game. Trim undone history so captured-piece displays match the board. |
| Documentation still says planning/no engine evaluation | Updated both READMEs with actual features, commands, deployment requirements, strength model, and limitations. |

**Regression positions**

- Defended pawn/trade: `4k3/8/4p3/3p4/2P1P3/8/8/4K3 w - - 0 1`. c4xd5 is not called an undefended free piece. With the e4 pawn present, legal exchanges show a favorable trade; without it, an equal exchange.
- False pin: `k7/8/p7/8/n7/8/1R6/7K w - - 0 1`, b2-a2. Pa6 prevents a pin of Na4 to Ka8.
- Distant skewer: `q7/8/8/k7/8/8/1R5K/8 w - - 0 1`, b2-a2. Detect Ka5 with Qa8 behind it.
- Pinned recapturing defender: `k3r3/8/2p5/3pR3/8/2N5/8/4K3 w - - 0 1`. Nxd5 cannot rely on Re5 recapturing after ...cxd5, because that rook is pinned to Ke1.
- Forced risk: `k7/8/8/8/8/8/5QPP/r6K w - - 0 1`. The hint acknowledges the difficult blocking move rather than promising safety.
- En passant: `4k3/8/8/8/3p4/8/4P3/4K3 w - - 0 1`. e2-e4 recognizes ...d4xe3 en passant as a capture of the pushed pawn.

These scenarios now have executable regressions rather than temporary probes.

**Verification**

- 115 unit/component tests pass, covering chess rules, danger, hints, tactics, review explanations, store behavior, and worker configuration/recovery. Includes startup failure, timeout/late events, termination, retry, stale results, end-of-game undo, promotion, and en passant cases.
- ESLint and standalone TypeScript checks pass. Production build passes. Whitespace checks pass.
- Chromium browser flows at 1280×900, 390×844, 844×390, and 320×568: no horizontal document overflow, no unnamed buttons in the playing screen, no page errors. Measured board-square widths: 61.5, 45.75, 44, and 44 px respectively.
- Selected Maximum while keeping Moves and Danger enabled; requested and visually inspected teaching hints.
- Intentionally blocked Stockfish worker downloads; verified the retry state, restored downloads, retried successfully, and continued play. Verified Undo, Finish game, Undo after finish, portrait/desktop/landscape resize updates, and reduced-motion animation behavior.
- Both bundled Stockfish WASM builds previously initialized and found mate in one in cross-origin-isolated Chromium. Engine settings are tested separately from browser loading.

**Remaining validation limits**

No measured human Elo claim is made. Statistical strength calibration requires a benchmark and repeated games against rated opponents. Actual-child usability sessions and real-device Safari/voice testing remain empirical validation work. Browser speech support and available voices depend on the user's device. No live deployment was tested or changed.

The app now gives more accurate, paced teaching feedback, preserves the board while children read/listen, and makes engine interruptions recoverable. It remains a practice helper rather than a complete curriculum or a proof that every suggested move is tactically best.
