import { Dialog, DialogPanel } from "@headlessui/react";
import { Fragment, ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MobileModalHeader } from "./MobileModalHeader";
import { MobileInfoBlock } from "./MobileInfoBlock";

type MobileModalProps = {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  paddingClass?: string;
  roundedClass?: string;
  customCloseButton?: ReactNode;
  height?: string;
  noBlur?: boolean;
  maxHeight?: string;
  showHeader?: boolean;
  headerInfoText?: string;
  showInfoBlock?: boolean;
};

export const MobileModal = ({
  isOpen,
  onClose,
  children,
  paddingClass = "pt-[20px] px-[20px] pb-[20px]",
  roundedClass = "rounded-t-[24px]",
  customCloseButton,
  height = "h-full",
  maxHeight,
  noBlur = false,
  showHeader = false,
  headerInfoText,
  showInfoBlock = true,
}: MobileModalProps) => {
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
              className={`fixed inset-0 ${
                noBlur
                  ? "bg-transparent"
                  : "bg-[rgba(12,16,21,0.5)] backdrop-blur-[20px]"
              }`}
            />
            <div className="fixed inset-x-0 bottom-0 flex justify-center">
              <DialogPanel as={Fragment}>
                <div className="relative w-full">
                  <motion.div
                    key="mobile-modal"
                    initial={{ y: "100%", opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: "100%", opacity: 0 }}
                    transition={{
                      type: "spring" as const,
                      stiffness: 300,
                      damping: 30,
                    }}
                    className={`relative w-full ${height} ${maxHeight} bg-[#14171F] ${roundedClass} text-white shadow-xl font-gotham before-modal-gradient-border overflow-visible block lg:hidden`}
                  >
                    {showHeader && showInfoBlock && (
                      <div className="absolute top-[24px] left-[24px] z-20 pl-2">
                        <MobileInfoBlock isLeft>
                          💡 Connecting your wallet is like “logging in” to
                          Web3. Select your wallet from the options to get
                          started
                        </MobileInfoBlock>
                      </div>
                    )}

                    {customCloseButton ||
                      (showHeader && (
                        <MobileModalHeader
                          onClose={onClose}
                          showInfoBlock={false}
                        />
                      ))}
                    <div className={`${paddingClass} h-full overflow-y-auto`}>
                      {children}
                    </div>
                  </motion.div>
                </div>
              </DialogPanel>
            </div>
          </div>
        </Dialog>
      )}
    </AnimatePresence>
  );
};
