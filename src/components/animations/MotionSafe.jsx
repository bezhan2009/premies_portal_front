import { motion } from "framer-motion";
import useReducedMotion from "../../hooks/useReducedMotion";

/**
 * A wrapper that renders a plain `<div>` when the user prefers reduced motion,
 * or a `<motion.div>` with the given animation props otherwise.
 *
 * This is useful for components where you want to be extra explicit about
 * skipping JS-level animations (beyond what MotionConfig already does).
 *
 * Usage:
 *   <MotionSafe initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
 *     <SomeContent />
 *   </MotionSafe>
 */
const MotionSafe = ({ children, ...motionProps }) => {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    // Spread only className and style for the plain div
    const { className, style } = motionProps;
    return (
      <div className={className} style={style}>
        {children}
      </div>
    );
  }

  return <motion.div {...motionProps}>{children}</motion.div>;
};

export default MotionSafe;
