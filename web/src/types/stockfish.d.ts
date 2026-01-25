/**
 * TypeScript declarations for Stockfish WASM
 *
 * The Stockfish WASM engine is loaded dynamically as a Web Worker,
 * communicating via message passing using the UCI protocol.
 */

declare module '*.wasm' {
  const content: string;
  export default content;
}

// Stockfish worker instance type
interface StockfishWorker extends Worker {
  postMessage(message: string): void;
}

// UCI response types
interface StockfishUciResponse {
  type: 'uciok' | 'readyok' | 'bestmove' | 'info' | 'option';
  data?: string;
}

// Stockfish info line components
interface StockfishInfo {
  depth?: number;
  seldepth?: number;
  time?: number;
  nodes?: number;
  pv?: string[];
  score?: {
    type: 'cp' | 'mate';
    value: number;
  };
  nps?: number;
  tbhits?: number;
}

// Best move response
interface StockfishBestMove {
  move: string;
  ponder?: string;
}
