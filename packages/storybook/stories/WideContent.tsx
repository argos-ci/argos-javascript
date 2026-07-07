import React from "react";

type WideContentProps = {
  /** Intrinsic content width in px, wider than the viewport. */
  width?: number;
};

/**
 * Renders fixed-width content wider than the viewport, used to reproduce
 * screenshots being cut off *horizontally* in the Vitest integration.
 */
export const WideContent = ({ width = 2400 }: WideContentProps) => {
  return (
    <div style={{ padding: 16, fontFamily: "sans-serif" }}>
      <div
        style={{
          width,
          padding: "12px 16px",
          border: "2px solid #c00",
          borderRadius: 6,
          background:
            "repeating-linear-gradient(90deg,#fff 0 200px,#f0f0f0 200px 400px)",
          whiteSpace: "nowrap",
          boxSizing: "border-box",
        }}
      >
        LEFT EDGE ← this box is {width}px wide, wider than the viewport, to test
        horizontal clipping → RIGHT EDGE
      </div>
    </div>
  );
};
