/**
 * Telegram-style animation configuration for the Activ chat system.
 * All animation presets are centralised here for consistency and easy tuning.
 */

// ---------------------------------------------------------------------------
// Spring presets
// ---------------------------------------------------------------------------

export const springPresets = {
  /** Telegram's signature "pop" — snappy with a touch of bounce */
  pop: {
    type: "spring",
    stiffness: 400,
    damping: 20,
    mass: 0.8,
  },

  /** Smooth slide — used for page/view transitions */
  slide: {
    type: "spring",
    stiffness: 300,
    damping: 25,
  },

  /** Quick fade — used for simple opacity-only transitions */
  fade: {
    duration: 0.2,
    ease: "easeOut",
  },

  /** Bouncy incoming message bubble */
  bounceIn: {
    type: "spring",
    stiffness: 500,
    damping: 30,
    mass: 0.6,
  },

  /** Gentle hover/micro-interaction response */
  gentle: {
    type: "spring",
    stiffness: 350,
    damping: 28,
    mass: 0.7,
  },

  /** Stagger container — pass as `transition` on a `variants` parent */
  stagger: {
    staggerChildren: 0.05,
    delayChildren: 0.05,
  },
};

// ---------------------------------------------------------------------------
// Reusable motion variants
// ---------------------------------------------------------------------------

export const variants = {
  /** Own message (sent) — enters from bottom-right with bounce */
  messageSent: {
    initial: { opacity: 0, y: 14, scale: 0.94, originX: 1, originY: 1 },
    animate: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: springPresets.bounceIn,
    },
    exit: {
      opacity: 0,
      scale: 0.88,
      height: 0,
      overflow: "hidden",
      margin: 0,
      padding: 0,
      transition: { duration: 0.18 },
    },
  },

  /** Received message — enters from bottom-left with pop */
  messageReceived: {
    initial: { opacity: 0, y: 16, scale: 0.96, originX: 0, originY: 1 },
    animate: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: springPresets.pop,
    },
    exit: {
      opacity: 0,
      scale: 0.88,
      height: 0,
      overflow: "hidden",
      margin: 0,
      padding: 0,
      transition: { duration: 0.18 },
    },
  },

  /** Context menu — pops in from slightly above */
  contextMenu: {
    initial: { opacity: 0, scale: 0.92, y: -6 },
    animate: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: springPresets.pop,
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      transition: { duration: 0.1 },
    },
  },

  /** Context menu item — staggered fade-slide in */
  menuItem: {
    initial: { opacity: 0, x: -8 },
    animate: { opacity: 1, x: 0 },
  },

  /** View slide — for threads/chat/new_chat switching */
  viewSlideRight: {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0, transition: springPresets.slide },
    exit: { opacity: 0, x: -20, transition: { duration: 0.15, ease: "easeIn" } },
  },

  viewSlideLeft: {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0, transition: springPresets.slide },
    exit: { opacity: 0, x: 20, transition: { duration: 0.15, ease: "easeIn" } },
  },

  /** Pop-up overlay (emoji picker, notification toast) */
  popUp: {
    initial: { opacity: 0, scale: 0.85, y: 10 },
    animate: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: springPresets.pop,
    },
    exit: {
      opacity: 0,
      scale: 0.85,
      y: 10,
      transition: { duration: 0.12 },
    },
  },

  /** Fade slide-down for toasts / notifications */
  toastSlide: {
    initial: { opacity: 0, y: -10, scale: 0.95 },
    animate: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: springPresets.gentle,
    },
    exit: {
      opacity: 0,
      y: -10,
      scale: 0.95,
      transition: { duration: 0.12 },
    },
  },

  /** Scale in/out — for badges, indicators */
  scaleIn: {
    initial: { scale: 0 },
    animate: {
      scale: 1,
      transition: { type: "spring", stiffness: 500, damping: 30 },
    },
    exit: {
      scale: 0,
      transition: { duration: 0.1 },
    },
  },

  /** Scroll-to-bottom button */
  scrollBtn: {
    initial: { opacity: 0, scale: 0.8, y: 10 },
    animate: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: springPresets.pop,
    },
    exit: {
      opacity: 0,
      scale: 0.8,
      y: 10,
      transition: { duration: 0.12 },
    },
  },

  /** Chat window itself */
  chatWindow: {
    initial: { opacity: 0, y: 40, scale: 0.95 },
    animate: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { type: "spring", damping: 30, stiffness: 350 },
    },
    exit: {
      opacity: 0,
      y: 40,
      scale: 0.95,
      transition: { duration: 0.2 },
    },
  },
};

// ---------------------------------------------------------------------------
// Gesture / interaction configs
// ---------------------------------------------------------------------------

export const gestures = {
  /** Standard button tap */
  tapButton: { scale: 0.88 },
  /** Subtle list-item tap */
  tapItem: { scale: 0.98 },
  /** Avatar hover */
  hoverAvatar: { scale: 1.05 },
  /** Send button hover */
  hoverSend: { scale: 1.06 },
};
