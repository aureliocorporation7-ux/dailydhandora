'use client'; // Error components must be Client Components

import { useEffect } from 'react';

export default function Error({ error, reset }) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center">
      <div className="text-center p-8 border border-red-500/50 rounded-lg bg-neutral-900 max-w-lg">
        <h2 className="text-2xl font-bold text-red-500 mb-4">कुछ गलत हो गया!</h2>
        <p className="mb-6">एप्लिकेशन में एक अनपेक्षित त्रुटि हुई।</p>
        
        <div className="bg-neutral-800 p-4 rounded-md text-left mb-6">
          <p className="text-sm text-neutral-400">त्रुटि का विवरण:</p>
          <pre className="text-sm text-red-400 whitespace-pre-wrap break-all">
            {error.message || 'An unknown error occurred.'}
          </pre>
        </div>

        <button
          onClick={() => reset()}
          className="px-6 py-2 rounded-md bg-primary text-white font-semibold hover:bg-primary/80 transition-colors"
        >
          पुनः प्रयास करें
        </button>
      </div>
    </div>
  );
}