// animations/config.js
export const springPresets = {
  // Telegram's signature "pop" animation
  pop: {
    type: "spring",
    stiffness: 400,
    damping: 20,
    mass: 0.8,
  },
  
  // Smooth slide animation
  slide: {
    type: "spring",
    stiffness: 300,
    damping: 25,
  },
  
  // Quick fade animation
  fade: {
    duration: 0.2,
    ease: "easeOut",
  },
  
  // Bouncy incoming message
  bounceIn: {
    type: "spring",
    stiffness: 500,
    damping: 30,
    mass: 0.6,
  },
  
  // Stagger children animation
  stagger: {
    staggerChildren: 0.08,
    delayChildren: 0.1,
  },
};

export const variants = {
  // Message sending animation
  messageSend: {
    initial: { 
      opacity: 0.5, 
      scale: 0.95, 
      y: 10 
    },
    animate: { 
      opacity: 1, 
      scale: 1, 
      y: 0,
      transition: springPresets.pop
    },
  },
  
  // Message receiving animation
  messageReceive: {
    initial: { 
      opacity: 0, 
      y: 15, 
      scale: 0.98 
    },
    animate: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: springPresets.bounceIn
    },
  },
  
  // Context menu open
  contextMenuOpen: {
    initial: { 
      opacity: 0, 
      scale: 0.9, 
      y: -5 
    },
    animate: { 
      opacity: 1, 
      scale: 1, 
      y: 0,
      transition: springPresets.pop
    },
  },
  
  // Chat slide transition
  chatSlide: {
    enter: {
      opacity: 0,
      x: 20,
      transition: { duration: 0.25, ease: "easeOut" }
    },
    center: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.25, ease: "easeOut" }
    },
    exit: {
      opacity: 0,
      x: -20,
      transition: { duration: 0.2, ease: "easeIn" }
    },
  },
};
