"use client";

import { useEffect } from "react";

// Catches errors in the root layout itself. Replaces the whole document,
// so it ships its own minimal inline-styled markup (no Tailwind guaranteed).
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
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#1a1c23",
          color: "#e8eaed",
        }}
      >
        <div style={{ textAlign: "center", padding: 40 }}>
          <h2 style={{ margin: "0 0 8px", fontSize: 18 }}>Something went wrong</h2>
          <p style={{ margin: "0 0 16px", fontSize: 13, color: "#9aa1ad" }}>
            The app hit an unexpected error.
          </p>
          <button
            onClick={reset}
            style={{
              background: "#7b68ee",
              color: "#fff",
              border: 0,
              borderRadius: 6,
              padding: "8px 14px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
