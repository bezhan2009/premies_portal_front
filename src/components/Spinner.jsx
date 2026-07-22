import React from "react";

const resolveSizeClassName = (size) => {
  switch (size) {
    case "small":
    case "sm":
      return "dot-spinner--sm";
    case "large":
    case "lg":
      return "dot-spinner--lg";
    default:
      return "dot-spinner--md";
  }
};

export default function Spinner({
  size = "medium",
  label = "",
  center = false,
  className = "",
}) {
  const wrapperClassName = [
    "spinner-state",
    center ? "spinner-state--center" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const spinnerClassName = ["dot-spinner", resolveSizeClassName(size)]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={wrapperClassName} role="status" aria-live="polite">
      <div className={spinnerClassName}>
        <div className="dot-spinner__dot" />
        <div className="dot-spinner__dot" />
        <div className="dot-spinner__dot" />
        <div className="dot-spinner__dot" />
        <div className="dot-spinner__dot" />
        <div className="dot-spinner__dot" />
        <div className="dot-spinner__dot" />
        <div className="dot-spinner__dot" />
      </div>
      {label ? <div className="spinner-state__label">{label}</div> : null}
    </div>
  );
}
