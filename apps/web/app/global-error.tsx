"use client";

interface GlobalErrorProps {
  reset: () => void;
}

const GlobalError = ({ reset }: GlobalErrorProps) => (
  <html lang="en">
    <body>
      <div style={{ padding: "4rem", textAlign: "center" }}>
        <h1>Something went wrong</h1>
        <p>An unexpected error occurred. Please try again.</p>
        <button onClick={reset} type="button">
          Try again
        </button>
      </div>
    </body>
  </html>
);

export default GlobalError;
