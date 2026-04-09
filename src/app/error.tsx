'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="text-center py-22">
      <h2 className="text-xl font-display mb-4">Something went wrong</h2>
      <p className="text-stone mb-6">{error.message}</p>
      <button
        onClick={reset}
        className="px-6 py-3 bg-black text-white rounded-pill"
      >
        Try again
      </button>
    </div>
  );
}
