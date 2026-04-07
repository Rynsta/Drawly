"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * Do not use initial opacity 0 — if the enter animation stalls after hydration,
 * content can stay invisible over the default white browser canvas.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { y: 8 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
