import React from 'react';
import { motion } from 'framer-motion';
import { useReducedMotion } from '../../hooks/useReducedMotion';

export const MotionSafe = ({ children, ...props }) => {
  const prefersReducedMotion = useReducedMotion();
  
  if (prefersReducedMotion) {
    return <div {...props} style={{ ...props.style }}>{children}</div>;
  }
  
  return <motion.div {...props}>{children}</motion.div>;
};

export default MotionSafe;
