import { useEffect, useState } from "react";

/**
 * Returns `true` when the user has enabled "Reduce Motion" in their OS.
 *
 * Note: Framer Motion's `MotionConfig reducedMotion="user"` in App.jsx already
 * handles this globally for motion.* components. This hook lets you apply
 * conditional logic (e.g., skipping JS-driven animation loops) in plain code.
 */
export const useReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  return prefersReducedMotion;
};

export default useReducedMotion;
