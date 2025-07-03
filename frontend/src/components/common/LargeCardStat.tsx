import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import classNames from "classnames";
import { CardStatProps } from "@/components/common/CardStat";
import { InfoPopup } from "../VaultsWrapper/components/InfoBlock.tsx/InfoPopup";

export default function LargeCardStat({
  id,
  label,
  value,
  secondaryValue,
  children,
  tooltip,
  tooltipChild,
}: CardStatProps): JSX.Element {
  const valueVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  };

  const uniformTransition = {
    duration: 0.4,
    ease: [0.25, 0.1, 0.25, 1] as const,
  };

  return (
    <div className="w-full cursor-pointer" id={id}>
      <div className="flex items-center gap-2 mb-1 relative group">
        <p className="text-[#535E73] font-normal text-sm md:text-[16px] whitespace-nowrap">
          {label}
          {(tooltip || tooltipChild) && (
            <div className="absolute bottom-full -ml-6 mb-4 left-1/2 -translate-x-1/2 hidden group-hover:block transition-all z-[9999]">
              <InfoPopup isMiddle autoWidth>
                {tooltip ? <p>{tooltip}</p> : tooltipChild}
              </InfoPopup>
            </div>
          )}
        </p>
      </div>

      {value ? (
        <>
          <AnimatePresence mode="wait">
            <motion.p
              key={value}
              variants={valueVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={uniformTransition}
              className="text-lg md:text-[20px] max-h-[22px] font-normal md:font-semibold whitespace-nowrap text-white leading-0 overflow-hidden text-ellipsis min-w-0"
            >
              {value}
            </motion.p>
          </AnimatePresence>

          {/* {secondaryValue && (
            <AnimatePresence mode="wait">
              <motion.p
                key={secondaryValue} 
                className={`text-xl whitespace-nowrap text-customGray300 -mt-2`}
                variants={valueVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={uniformTransition}
              >
                {secondaryValue}
              </motion.p>
            </AnimatePresence>
          )} */}
        </>
      ) : (
        <div className="text-lg md:text-[20px] max-h-[22px] font-normal md:font-semibold whitespace-nowrap text-white leading-0 overflow-hidden text-ellipsis min-w-0">
          {children}
        </div>
      )}

      {(tooltip || tooltipChild) && (
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block transition-all z-[9999]">
          <InfoPopup isMiddle autoWidth>
            {tooltip ? <p>{tooltip}</p> : tooltipChild}
          </InfoPopup>
        </div>
      )}
    </div>
  );
}
