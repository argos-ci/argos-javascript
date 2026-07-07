import React from "react";

type TallContentProps = {
  /**
   * Number of rows to render. Enough rows make the content taller than the
   * browser viewport, which is required to reproduce the screenshot clipping.
   */
  count?: number;
};

/**
 * A component that renders a tall list of rows, taller than the viewport.
 * Used to reproduce screenshots being cut off in the Vitest integration.
 */
export const TallContent = ({ count = 40 }: TallContentProps) => {
  return (
    <div style={{ padding: 16, fontFamily: "sans-serif" }}>
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          style={{
            padding: "12px 16px",
            margin: "8px 0",
            border: "1px solid #ccc",
            borderRadius: 6,
            background: index % 2 ? "#f5f5f5" : "#fff",
          }}
        >
          Row {index + 1} — this is a tall content row to force the page to
          overflow the viewport height
        </div>
      ))}
    </div>
  );
};
