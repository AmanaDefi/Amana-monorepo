import { FC, ReactNode, useState, useEffect } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/solid";
import { motion, AnimatePresence } from "framer-motion";

type Props = {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
  isOpen?: boolean;
  onToggle?: (isOpen: boolean) => void;
  transparentDesktop?: boolean;
};

const Dropdown: FC<Props> = ({
  title,
  defaultOpen = false,
  children,
  isOpen: externalIsOpen,
  onToggle,
  transparentDesktop = false,
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(defaultOpen);

  const isControlled = externalIsOpen !== undefined && onToggle !== undefined;
  const isOpen = isControlled ? externalIsOpen : internalIsOpen;

  useEffect(() => {
    if (isControlled && externalIsOpen !== internalIsOpen) {
      setInternalIsOpen(externalIsOpen);
    }
  }, [externalIsOpen, isControlled, internalIsOpen]);

  const handleToggle = () => {
    const newIsOpen = !isOpen;

    if (isControlled) {
      onToggle(newIsOpen);
    } else {
      setInternalIsOpen(newIsOpen);
    }
  };

  const containerClasses = `
    bg-transparent md:bg-[#14171F] 
    rounded-none md:rounded-2xl 
    py-4 md:py-6 
    px-0 md:px-[30px] 
    font-gotham 
    transition-all duration-300 ease-in-out 
    ${isOpen ? "border-transparent md:border md:border-[#2A2D36]" : "border-transparent"}
  `;

  const contentClasses = transparentDesktop
    ? "bg-transparent rounded-lg "
    : "bg-[#161C27] rounded-lg p-6 lg:p-8";

  return (
    <div className={containerClasses}>
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={handleToggle}
      >
        <p className="text-white text-xl md:text-2xl font-medium">{title}</p>
        <button className="p-2">
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <ChevronDownIcon className="w-6 h-6 text-white" />
          </motion.div>
        </button>
      </div>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            className="md:hidden overflow-hidden"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1, marginTop: 16 }}
            exit={{ height: 0, opacity: 0, marginTop: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <div className="bg-transparent min-h-[180px] rounded-none p-0 md:p-4 max-h-[250px] overflow-y-auto">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            className="hidden md:block overflow-hidden"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1, marginTop: 24 }}
            exit={{ height: 0, opacity: 0, marginTop: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <div className={contentClasses}>{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dropdown;
