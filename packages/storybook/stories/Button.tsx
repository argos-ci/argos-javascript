import React, { type MouseEventHandler } from "react";

import "./button.css";

type ButtonProps = {
  primary?: boolean;
  backgroundColor?: string;
  size?: "small" | "medium" | "large";
  label: string;
  onClick: MouseEventHandler;
};

export const Button = ({
  primary,
  backgroundColor,
  size = "medium",
  label,
  ...props
}: ButtonProps) => {
  const mode = primary
    ? "storybook-button--primary"
    : "storybook-button--secondary";
  return (
    <button
      type="button"
      className={["storybook-button", `storybook-button--${size}`, mode].join(
        " ",
      )}
      style={backgroundColor ? { backgroundColor } : undefined}
      {...props}
    >
      {label}
    </button>
  );
};
