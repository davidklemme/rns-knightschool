import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // COOP/COEP enable cross-origin isolation, which is required for
  // SharedArrayBuffer - without it the multi-threaded Stockfish engine
  // (used by the stronger difficulty levels) fails to start.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
        ],
      },
    ];
  },
};

export default nextConfig;
