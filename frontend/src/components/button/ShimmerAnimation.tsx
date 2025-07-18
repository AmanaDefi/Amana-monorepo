"use client";
import React, { ReactNode } from "react";
import { motion } from "framer-motion";
import cn from "classnames";

interface ShimmerAnimationProps {
  children: ReactNode;
  enabled?: boolean;
  className?: string;
  disabled?: boolean;
}

export const ShimmerAnimation: React.FC<ShimmerAnimationProps> = ({
  children,
  enabled = false,
  className = "",
  disabled = false,
}) => {
  const shouldAnimate = enabled && !disabled;

  return (
    <motion.div
      className={cn("relative inline-block", className)}
      initial={{ scale: 1 }}
      whileHover={{ scale: shouldAnimate ? 1.02 : 1 }}
      whileTap={{ scale: shouldAnimate ? 0.98 : 1 }}
    >
      <div className="relative overflow-hidden w-full">
        {children}

        {shouldAnimate && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none"
            initial={{ x: "-200%", skewX: -45 }}
            animate={{
              x: ["-200%", "200%"],
              transition: {
                duration: 2,
                repeat: Infinity,
                repeatDelay: 3,
                ease: "easeInOut",
              },
            }}
          />
        )}

        {shouldAnimate && (
          <>
            <motion.div
              className="absolute inset-0  rounded-lg pointer-events-none"
              animate={{
                scale: [1, 1.4],
                opacity: [0.5, 0],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeOut",
              }}
            />

            <motion.div
              className="absolute inset-0 rounded-lg pointer-events-none"
              animate={{
                scale: [1, 1.6],
                opacity: [0.3, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeOut",
                delay: 0.5,
              }}
            />
          </>
        )}
        {shouldAnimate && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            animate={{
              filter: [
                "drop-shadow(0 0 5px rgba(255,255,255,0.3))",
                "drop-shadow(0 0 10px rgba(255,255,255,0.5))",
              ],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatType: "reverse",
              ease: "easeInOut",
            }}
          />
        )}

        {shouldAnimate && (
          <motion.div
            className="absolute inset-0 bg-gradient-radial from-white/10 to-transparent opacity-0 pointer-events-none rounded-lg"
            animate={{
              opacity: [0, 0.4],
              scale: [0.8, 1.2],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              repeatType: "reverse",
              ease: "easeInOut",
              delay: 1,
            }}
          />
        )}
      </div>
    </motion.div>
  );
};
