import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import classNames from "classnames";
import { CardStatProps } from "@/components/common/CardStat";
import { WithTooltip } from "./Tooltip";

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

  const renderValue = () => {
    if (value) {
      const valueElement = (
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
      );

      if (tooltip || tooltipChild) {
        return (
          <WithTooltip
            content={typeof tooltip === "string" ? tooltip : ""}
            tooltipChild={
              tooltipChild ||
              (typeof tooltip !== "string" ? tooltip : undefined)
            }
            subId={id}
          >
            <div className="inline-block cursor-pointer">{valueElement}</div>
          </WithTooltip>
        );
      }

      return valueElement;
    } else {
      const childrenElement = (
        <div className="text-lg md:text-[20px] max-h-[22px] font-normal md:font-semibold whitespace-nowrap text-white leading-0 overflow-hidden text-ellipsis min-w-0">
          {children}
        </div>
      );

      if (tooltip || tooltipChild) {
        return (
          <WithTooltip
            content={typeof tooltip === "string" ? tooltip : ""}
            tooltipChild={
              tooltipChild ||
              (typeof tooltip !== "string" ? tooltip : undefined)
            }
            subId={id}
          >
            <div className="inline-block cursor-pointer">{childrenElement}</div>
          </WithTooltip>
        );
      }

      return childrenElement;
    }
  };

  return (
    <div className="w-full" id={id}>
      <div className="w-full flex flex-col items-center justify-center">
        <div className="flex items-center gap-2 mb-1">
          <div className="text-[#535E73] font-normal text-sm md:text-[16px] whitespace-nowrap">
            {label}
          </div>
        </div>

        {renderValue()}

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
      </div>
    </div>
  );
}
