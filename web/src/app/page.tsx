'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Landing page - redirects to play page
 * In a full implementation, this could have a welcome screen,
 * instructions, or player selection.
 */
export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Auto-redirect to play page
    router.push('/play');
  }, [router]);

  return (
    <div className="h-screen bg-gradient-to-br from-amber-100 via-orange-100 to-yellow-100 flex items-center justify-center">
      <div className="text-center">
        <span className="text-6xl block mb-4">&#9816;</span>
        <h1 className="text-3xl font-bold text-amber-800 mb-2">KnightSchool</h1>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  );
}
