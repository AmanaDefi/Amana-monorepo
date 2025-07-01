"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

type ElephantLoaderProps = {
  isLoading: boolean;
  onComplete?: () => void;
};

const ElephantLoader = ({ isLoading, onComplete }: ElephantLoaderProps) => {
  const [progress, setProgress] = useState(0);
  const [hasCompleted, setHasCompleted] = useState(false);
  const [containerWidth, setContainerWidth] = useState(427);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerWidth(rect.width);
      }
    };

    updateWidth();
    window?.addEventListener("resize", updateWidth);
    return () => window?.removeEventListener("resize", updateWidth);
  }, []);

  useEffect(() => {
    if (!isLoading) return;

    setProgress(0);
    setHasCompleted(false);

    const interval = setInterval(() => {
      setProgress((prev) => (prev >= 100 ? 100 : prev + 1));
    }, 30);

    return () => clearInterval(interval);
  }, [isLoading]);

  useEffect(() => {
    if (progress >= 100 && !hasCompleted) {
      setHasCompleted(true);
      onComplete?.();
    }
  }, [progress, hasCompleted, onComplete]);

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="relative w-full max-w-[427px] mt-12 sm:mt-[59px] mx-auto px-4 sm:px-0"
        >
          <div
            ref={containerRef}
            className="relative w-full h-1 bg-[#535E73] rounded-[4px] overflow-hidden"
          >
            <motion.div
              className="absolute top-0 left-0 h-full bg-[#1B46E0] rounded-[4px]"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{
                duration: 0.3,
                ease: "easeOut",
              }}
            />
          </div>

          <motion.div
            className="absolute -top-[20px] left-0"
            animate={{
              x: Math.max(0, (progress / 100) * containerWidth - 20),
            }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30,
            }}
          >
            <motion.div
              animate={{
                y: [0, -3, 0],
                rotate: progress > 0 ? [0, 2, -2, 0] : 0,
              }}
              transition={{
                y: {
                  duration: 1,
                  repeat: Infinity,
                  ease: "easeInOut",
                },
                rotate: {
                  duration: 0.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                },
              }}
            >
              <img
                src="/elephant.gif"
                alt="Elephant"
                width={40}
                height={40}
                className="w-10 h-10 drop-shadow-lg"
              />
            </motion.div>
          </motion.div>
          <motion.div
            className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-sm text-[#535E73] font-medium"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {Math.round(progress)}%
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ElephantLoader;
