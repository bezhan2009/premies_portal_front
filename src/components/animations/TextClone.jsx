import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';

const EMOJI_FONT_STACK = "'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'";

export const TextClone = ({ text, position, onAnimationComplete }) => {
  const [bubblePosition, setBubblePosition] = useState(null);
  const cloneRef = useRef(null);
  
  useEffect(() => {
    const messageList = document.querySelector('.chat-messages');
    
    // Default fallback position (bottom right of the window)
    let targetX = window.innerWidth - Math.min(position.width || 250, 350) - 40;
    let targetY = window.innerHeight - 180;
    let targetWidth = Math.min(position.width || 250, 350);
    let targetHeight = position.height || 50;
    
    if (messageList) {
      const containerRect = messageList.getBoundingClientRect();
      // Target is aligned to the right of the scroll container, near the bottom
      targetWidth = Math.min(position.width || 250, containerRect.width * 0.7);
      targetX = containerRect.right - targetWidth - 24;
      targetY = containerRect.bottom - targetHeight - 16;
    }
    
    setBubblePosition({
      x: targetX,
      y: targetY,
      width: targetWidth,
      height: targetHeight,
    });
  }, [position]);
  
  // Custom theme colors for red/brand theme
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
  const colors = currentTheme === 'dark' 
    ? ['#991b1b', '#eb2525', '#f87171'] 
    : ['#eb2525', '#f87171', '#fca5a5'];
  
  if (!bubblePosition) return null;
  
  return (
    <motion.div
      ref={cloneRef}
      className="text-clone animating-gpu"
      initial={{
        position: 'fixed',
        left: 0,
        top: 0,
        x: position.x,
        y: position.y,
        width: position.width,
        height: position.height,
        opacity: 0.8,
        scale: 1,
        zIndex: 99999,
        pointerEvents: 'none',
        borderRadius: '18px',
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        background: 'transparent',
      }}
      animate={{
        x: bubblePosition.x,
        y: bubblePosition.y,
        width: bubblePosition.width,
        height: bubblePosition.height,
        opacity: 1,
        scale: 1.02,
        borderRadius: '16px 16px 4px 16px',
      }}
      transition={{
        type: "spring",
        stiffness: 400,
        damping: 25,
        mass: 0.8,
      }}
      onAnimationComplete={onAnimationComplete}
    >
      {/* The text with gradient overlay */}
      <motion.div
        className="clone-text"
        initial={{
          background: 'var(--bg-sidebar, #ffffff)',
          color: 'var(--text-color, #000000)',
          padding: '8px 12px',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          boxSizing: 'border-box',
          fontFamily: EMOJI_FONT_STACK,
          fontSize: '14.5px',
          lineHeight: '1.4',
        }}
        animate={{
          background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]}, ${colors[2]})`,
          color: '#ffffff',
          padding: '12px 16px',
        }}
        transition={{
          duration: 0.35,
          ease: "easeOut",
        }}
      >
        <span style={{ whiteSpace: 'pre-wrap', width: '100%' }}>{text}</span>
      </motion.div>
      
      {/* Gradient shine animation */}
      <motion.div
        className="gradient-shine"
        initial={{ x: '-100%' }}
        animate={{ x: '100%' }}
        transition={{
          duration: 0.6,
          ease: "easeInOut",
          repeat: 1,
        }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
          pointerEvents: 'none',
        }}
      />
    </motion.div>
  );
};

export default TextClone;
