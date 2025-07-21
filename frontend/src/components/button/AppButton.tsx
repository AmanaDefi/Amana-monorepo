"use client";
import { motion } from "framer-motion";
import classNames from "classnames";
import { MouseEvent, ReactNode } from "react";

export const AppButton = ({
  children,
  onClick,
  disabled,
  isIconOnly,
  variant,
  link,
  enableAnimations = false,
}: {
  children: ReactNode;
  onClick: (e: MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  isIconOnly?: boolean;
  variant: "blue" | "reverse" | "gray";
  link?: string;
  enableAnimations?: boolean;
}) => {
  const baseClasses = classNames(
    "flex justify-center items-center text-center text-white rounded-lg transition-all relative overflow-hidden",
    {
      "flex-1 w-full": !isIconOnly,
      "!p-0 !w-[56px] !h-[56px]": isIconOnly,
      "py-2 md:py-[10px] px-4": !isIconOnly,
      "px-2": typeof children === "number" && !isIconOnly,
    },
  );

  const variantClasses = classNames({
    "bg-[#171D26] border border-[#323234] hover:border-blue-button hover:bg-blue-button disabled:bg-[#35383D] disabled:border-[#35383D]":
      variant === "gray",
    "bg-blue-button hover:!bg-[#0C1015] border !border-blue-button hover:!border-[#3E73C4]":
      variant === "blue",
    "bg-[#0C1015] border !border-[#3E73C4]": variant === "reverse",
  });

  if (link) {
    return (
      <motion.a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        className={classNames(baseClasses, variantClasses)}
        initial={{ scale: 1, rotateZ: 0 }}
      >
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
          initial={{ x: "-200%", skewX: -45 }}
          animate={
            enableAnimations
              ? {
                  x: ["-200%", "200%"],
                  transition: {
                    duration: 2,
                    repeat: Infinity,
                    repeatDelay: 3,
                    ease: "easeInOut",
                  },
                }
              : {}
          }
        />

        {enableAnimations && (
          <>
            <motion.div
              className="absolute inset-0 border-2 border-white/20 rounded-lg"
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
              className="absolute inset-0 border-2 border-white/10 rounded-lg"
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

        <motion.span
          className="relative z-10 flex items-center justify-center gap-2"
          animate={
            enableAnimations
              ? {
                  textShadow: [
                    "0 0 5px rgba(255,255,255,0.3)",
                    "0 0 10px rgba(255,255,255,0.5)",
                  ],
                }
              : {}
          }
          transition={
            enableAnimations
              ? {
                  textShadow: {
                    duration: 2,
                    repeat: Infinity,
                    repeatType: "reverse",
                    ease: "easeInOut",
                  },
                }
              : {}
          }
        >
          {children}
        </motion.span>

        {enableAnimations && (
          <motion.div
            className="absolute inset-0 bg-gradient-radial from-white/10 to-transparent opacity-0"
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
      </motion.a>
    );
  }

  return (
    <motion.button
      disabled={disabled}
      className={classNames(baseClasses, variantClasses)}
      onClick={onClick}
      initial={{ scale: 1, rotateZ: 0 }}
    >
      {!disabled && enableAnimations && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
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

      {!disabled && enableAnimations && (
        <>
          <motion.div
            className="absolute inset-0 border-2 border-white/20 rounded-lg"
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
            className="absolute inset-0 border-2 border-white/10 rounded-lg"
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

      <motion.span
        className="relative z-10 flex items-center justify-center gap-2"
        animate={
          !disabled && enableAnimations
            ? {
                textShadow: [
                  "0 0 5px rgba(255,255,255,0.3)",
                  "0 0 10px rgba(255,255,255,0.5)",
                ],
              }
            : {}
        }
        transition={
          !disabled && enableAnimations
            ? {
                textShadow: {
                  duration: 2,
                  repeat: Infinity,
                  repeatType: "reverse",
                  ease: "easeInOut",
                },
              }
            : {}
        }
      >
        {children}
      </motion.span>

      {!disabled && enableAnimations && (
        <motion.div
          className="absolute inset-0 bg-gradient-radial from-white/10 to-transparent opacity-0"
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
    </motion.button>
  );
};
