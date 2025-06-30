import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import ResponsiveTooltip from "@/components/common/Tooltip";
import { CardStatProps } from "@/components/common/CardStat";

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
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
  };

  return (
    <div className="w-full cursor-pointer" id={id}>
      <p className="text-[#535E73] font-normal text-sm md:text-[16px] whitespace-nowrap w-1/2 md:w-full mb-1">
        {label}
      </p>
      {value ? (
        <>
          <AnimatePresence mode="wait">
            <motion.p
              key={value}
              variants={valueVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3 }}
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
                transition={{ duration: 0.3 }}
              >
                {secondaryValue}
              </motion.p>
            </AnimatePresence>
          )} */}
        </>
      ) : (
        <>{children}</>
      )}

      {tooltip && tooltip !== "" && (
        <ResponsiveTooltip
          id={id}
          content={<p className="w-52">{tooltip}</p>}
        />
      )}
      {!tooltip && tooltipChild && (
        <ResponsiveTooltip id={id} content={tooltipChild} />
      )}
    </div>
  );
}
