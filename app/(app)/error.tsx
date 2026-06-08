"use client";

import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";

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
    <div className="flex h-full flex-1 flex-col items-center justify-center gap-3 p-10 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cu-hover text-cu-urgent">
        <TriangleAlert className="h-6 w-6" />
      </div>
      <div>
        <p className="text-[15px] font-semibold text-cu-text">Something went wrong</p>
        <p className="mt-1 text-[13px] text-cu-text-tertiary">
          An unexpected error occurred. You can try again or reload the page.
        </p>
      </div>
      <button
        onClick={reset}
        className="rounded-md bg-cu-purple px-3 py-1.5 text-[13px] font-medium text-white hover:bg-cu-purple-dark"
      >
        Try again
      </button>
    </div>
  );
}
