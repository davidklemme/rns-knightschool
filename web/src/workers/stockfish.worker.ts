/**
 * Stockfish Web Worker
 *
 * This worker handles communication with the Stockfish WASM engine.
 * For MVP, this is a placeholder that can be upgraded to use actual
 * Stockfish WASM (stockfish.wasm / stockfish.js from official sources).
 *
 * To upgrade:
 * 1. Download stockfish.wasm and stockfish.js
 * 2. Place in public folder
 * 3. Uncomment the Stockfish initialization code below
 * 4. Remove the mock implementation
 */

// Message types for communication with main thread
interface WorkerMessage {
  type: 'init' | 'position' | 'go' | 'stop' | 'setSkill';
  payload?: unknown;
}

interface WorkerResponse {
  type: 'ready' | 'bestmove' | 'info' | 'error';
  payload?: unknown;
}

// Current state
let isReady = false;
let currentFen = '';

// Handle messages from main thread
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { type, payload } = event.data;

  try {
    switch (type) {
      case 'init':
        // Initialize Stockfish engine
        // In real implementation: load stockfish.wasm
        await initEngine();
        break;

      case 'position':
        // Set position from FEN
        currentFen = payload as string;
        break;

      case 'go':
        // Calculate best move
        const options = payload as { depth?: number; time?: number };
        await calculateMove(options);
        break;

      case 'setSkill':
        // Set skill level (for actual Stockfish, this sets the Skill Level option)
        const skill = payload as number;
        setSkillLevel(skill);
        break;

      case 'stop':
        // Stop current calculation
        stopCalculation();
        break;
    }
  } catch (error) {
    postResponse({ type: 'error', payload: String(error) });
  }
};

/**
 * Initialize the chess engine
 */
async function initEngine(): Promise<void> {
  // Mock initialization - replace with actual Stockfish load
  await new Promise((resolve) => setTimeout(resolve, 100));

  isReady = true;
  postResponse({ type: 'ready' });
}

/**
 * Calculate the best move for the current position
 */
async function calculateMove(options: { depth?: number; time?: number }): Promise<void> {
  if (!isReady || !currentFen) {
    postResponse({ type: 'error', payload: 'Engine not ready or no position set' });
    return;
  }

  // Simulate thinking time
  const thinkTime = options.time || 500;
  await new Promise((resolve) => setTimeout(resolve, thinkTime));

  // In real implementation, this would parse Stockfish output
  // For now, return a placeholder - the actual move generation
  // is done in the StockfishService for simplicity
  postResponse({
    type: 'bestmove',
    payload: {
      move: 'e2e4', // Placeholder
      ponder: 'e7e5',
    },
  });
}

/**
 * Set the skill level (0-20 for Stockfish)
 */
function setSkillLevel(level: number): void {
  // In real implementation: send UCI command
  // setoption name Skill Level value {level}
  console.log(`Skill level set to ${level}`);
}

/**
 * Stop the current calculation
 */
function stopCalculation(): void {
  // In real implementation: send 'stop' to Stockfish
  console.log('Calculation stopped');
}

/**
 * Post a response back to the main thread
 */
function postResponse(response: WorkerResponse): void {
  self.postMessage(response);
}

// Export empty object for TypeScript module
export {};
