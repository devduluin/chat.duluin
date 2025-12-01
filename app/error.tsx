'use client';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Something went wrong!</h1>
        <p className="text-gray-600 mb-6">
          We're sorry, but an unexpected error occurred. Our team has been notified.
        </p>
        <button
          onClick={() => reset()}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
        <div className="mt-6 text-sm text-gray-500">
          <p>Need immediate help?</p>
          <a 
            href="/contact" 
            className="text-blue-600 hover:underline"
          >
            Contact Support
          </a>
        </div>
      </div>
    </div>
  );
}