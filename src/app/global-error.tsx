'use client';

import { useEffect } from 'react';

export default function GlobalError({
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
    <html>
      <body className="bg-white text-near-black flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-display mb-4">Something went wrong</h1>
          <p className="text-stone mb-6">{error.message}</p>
          <button
            onClick={reset}
            className="px-6 py-3 bg-black text-white rounded-pill"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
