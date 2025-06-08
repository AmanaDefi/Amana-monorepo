import { Dialog, DialogPanel } from "@headlessui/react";
import { Fragment, ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import CloseModalIcon from "../svg/CloseModalIcon";

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  paddingClass?: string;
  roundedClass?: string;
};

export const Modal = ({
  isOpen,
  onClose,
  children,
  paddingClass = "p-6",
  roundedClass = "rounded-[16px]",
}: ModalProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog open={isOpen} onClose={onClose} as={Fragment}>
          <div className="relative z-50">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="fixed inset-0 bg-[rgba(12,16,21,0.5)] backdrop-blur-[20px]"
            />

            <div className="fixed inset-0 flex items-center justify-center p-4">
              <DialogPanel as={Fragment}>
                <motion.div
                  key="modal"
                  initial={{ y: 100, opacity: 0, scale: 0.95 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  exit={{ y: 100, opacity: 0, scale: 0.95 }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 24,
                  }}
                  className={`relative w-full max-w-md bg-[#14171F] ${roundedClass} text-white shadow-xl font-gotham before-gradient-border ${paddingClass}`}
                >
                  <button
                    onClick={onClose}
                    className="absolute rounded-[8px] flex items-center justify-center w-10 h-10"
                    aria-label="Close"
                  >
                    <CloseModalIcon width={16} height={16} />
                  </button>

                  {children}
                </motion.div>
              </DialogPanel>
            </div>
          </div>
        </Dialog>
      )}
    </AnimatePresence>
  );
};
