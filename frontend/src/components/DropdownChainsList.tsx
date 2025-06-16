import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

export const DropdownChainsList = ({
  width,
  isIconButton,
  options,
  selectedOption,
  handleSelectedOption,
  isShownList,
  needReset = true,
  minWidth,
  maxWidth,
  alignment = "left",
}: {
  width: number;
  isIconButton: boolean;
  options: { value: string; icon?: string }[];
  selectedOption: string;
  handleSelectedOption: (
    event:
      | React.MouseEvent<HTMLParagraphElement, MouseEvent>
      | React.MouseEvent<HTMLButtonElement, MouseEvent>,
    option: string,
  ) => void;
  isShownList: boolean;
  needReset?: boolean;
  minWidth?: number | string;
  maxWidth?: number | string;
  alignment?: "left" | "right";
}) => {
  return (
    <AnimatePresence>
      {isShownList && (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          style={{
            width,
            minWidth,
            maxWidth,
            top: !needReset ? 65 : isIconButton ? 30 : 40,
          }}
          className={`z-10 rounded-2xl absolute top-14 flex flex-col gap-2 bg-[#14171F] shadow-[0_4px_6px_0_rgba(0,0,0,0.15)] p-6 ${alignment === "right" ? "right-0" : "left-0"}`}
          role="menu"
        >
          {isIconButton && (
            <div className="flex w-full justify-start">
              <p className="text-sm leading-4 text-[#535E73] font-normal">
                Filters
              </p>
            </div>
          )}
          {options.map((option, index) => (
            <motion.div
              key={option.value}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03, duration: 0.2 }}
              className="group hover:cursor-pointer hover:shadow-[0_4px_6px_0_rgba(0,0,0,0.15)] hover:bg-[#1D2A41] max-h-9 flex rounded-[4px] py-3 w-full flex-row justify-between items-center transition-colors duration-200"
              onClick={(event) => handleSelectedOption(event, option.value)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="font-normal flex flex-row gap-2 items-center py-2 px-4">
                {option.icon && (
                  <Image
                    src={option.icon || ""}
                    alt={option.value}
                    width={20}
                    height={20}
                    className="rounded-full"
                    sizes="20px"
                  />
                )}
                <p>{option.value}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
