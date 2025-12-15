import { motion } from "framer-motion";

export default function PageWrapper({ children }) {
  return (
    <motion.div
      style={{ width: "100%" }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{
        duration: 0.25,
        ease: "easeInOut"
      }}
    >
      {children}
    </motion.div>
  );
}
