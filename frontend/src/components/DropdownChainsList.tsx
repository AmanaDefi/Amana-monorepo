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
  variant = "chain",
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
  variant?: "chain" | "token";
}) => {
  const isToken = variant === "token";

  return (
    <AnimatePresence>
      {isShownList && (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          style={{
            maxWidth,
            width,
            top: !needReset ? 65 : isIconButton ? 30 : 40,
          }}
          className={`dropdown-scrollbar z-10 ${minWidth && "xl:min-w-[263px] md:!w-[263px] !w-[90vw]"} rounded-2xl absolute top-14 flex flex-col gap-2 bg-[#14171F] shadow-[0_4px_6px_0_rgba(0,0,0,0.15)] p-2 md:p-4 ${alignment === "right" ? "md:right-0 -left-[160px] md:left-auto" : "left-0"} max-h-[260px] overflow-y-auto`}
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
                <p className={`${isToken ? "text-white" : "text-white"}`}>
                  {option.value}
                </p>
              </div>
            </motion.div>
          ))}

          {needReset && (
            <motion.button
              type="button"
              onClick={(event) => handleSelectedOption(event, "")}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: options.length * 0.03 + 0.1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`py-3 underline font-normal text-sm leading-4 transition-all duration-200 lg:hidden ${
                isToken
                  ? "text-white hover:text-gray-300"
                  : "text-[#535E73] hover:text-blue-button"
              }`}
            >
              Reset to default
            </motion.button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
