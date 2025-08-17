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
            key={
              typeof value === "string" ? value : `react-node-${Math.random()}`
            }
            variants={valueVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={uniformTransition}
            className="text-lg md:text-[20px]font-normal md:font-semibold whitespace-nowrap text-white leading-tight text-ellipsis min-w-0 text-center"
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
            <div className="w-full flex justify-center cursor-pointer min-w-0">
              {valueElement}
            </div>
          </WithTooltip>
        );
      }

      return (
        <div className="w-full flex justify-center min-w-0">{valueElement}</div>
      );
    } else {
      const childrenElement = (
        <div className="text-lg md:text-[20px] font-normal md:font-semibold whitespace-nowrap text-white leading-tight text-ellipsis min-w-0 text-center">
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
            <div className="w-full flex justify-center cursor-pointer min-w-0">
              {childrenElement}
            </div>
          </WithTooltip>
        );
      }

      return (
        <div className="w-full flex justify-center min-w-0">
          {childrenElement}
        </div>
      );
    }
  };

  return (
    <div className="w-full min-w-0" id={id}>
      <div className="w-full flex flex-col items-center justify-center min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <div className="text-[#535E73] font-normal text-sm md:text-[16px] whitespace-nowrap overflow-hidden text-ellipsis max-w-full">
            {label}
          </div>
        </div>

        <div className="w-full flex justify-center min-w-0">
          {renderValue()}
        </div>
      </div>
    </div>
  );
}
