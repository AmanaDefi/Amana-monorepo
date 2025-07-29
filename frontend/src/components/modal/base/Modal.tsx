import { Dialog, DialogPanel } from "@headlessui/react";
import { Fragment, ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import ZetaChainLogo from "@public/logo/zetachain.svg";
import Link from "next/link";
import GlowIcon from "@/components/svg/GlowIcon";

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  paddingClass?: string;
  roundedClass?: string;
  customCloseButton?: ReactNode;
  maxWidth?: string;
  minHeight?: string;
  noBlur?: boolean;
};

export const Modal = ({
  isOpen,
  onClose,
  children,
  paddingClass = "p-6",
  roundedClass = "rounded-[16px]",
  customCloseButton,
  maxWidth = "max-w-md",
  minHeight,
  noBlur = false,
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
              className={`fixed inset-0 ${
                noBlur
                  ? "bg-transparent"
                  : "md:bg-[rgba(12,16,21,0.5)] md:backdrop-blur-[10px] bg-[#0C1015]"
              }`}
            >
              <div className="md:hidden">
                <GlowIcon position="top-mobile" />
                <GlowIcon position="bottom-mobile" />
              </div>
            </motion.div>
            <div className="fixed inset-0 flex flex-col md:items-center md:justify-center justify-between items-center pt-10 p-4 pb-2 h-[100dvh] md:h-[95vh]">

              <DialogPanel as={Fragment}>
                <motion.div
                  key="modal"
                  initial={{ y: 100, opacity: 0, scale: 0.95 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  exit={{ y: 100, opacity: 0, scale: 0.95 }}
                  transition={{
                    type: "spring" as const,
                    stiffness: 300,
                    damping: 24,
                  }}
                  className={`relative flex w-full ${maxWidth} ${minHeight} bg-[#14171F] ${roundedClass} text-white shadow-xl font-gotham before-gradient-border flex-shrink-0`}
                >
                  {customCloseButton}
                  <div className={paddingClass}>{children}</div>
                </motion.div>
              </DialogPanel>

              <div
                className="block md:hidden w-full flex-shrink-0 relative"
                style={{ zIndex: 9999 }}
              >
                <div
                  className="relative w-full flex justify-center items-center font-gotham"
                  style={{
                    paddingBottom:
                      "max(12px, env(safe-area-inset-bottom), 12px)",
                    paddingTop: "12px",
                    minHeight: "60px",
                    zIndex: 9999,
                    position: "relative",
                    backgroundColor: "transparent",
                    pointerEvents: "auto",
                  }}
                >
                  <div
                    className="flex items-center gap-4"
                    style={{
                      zIndex: 9999,
                      position: "relative",
                    }}
                  >
                    <span
                      className="uppercase text-white text-sm font-normal tracking-wide"
                      style={{
                        fontSize: "16px",
                        lineHeight: "112%",
                        textShadow: "0 1px 3px rgba(0,0,0,0.8)",
                        position: "relative",
                        zIndex: 9999,
                      }}
                    >
                      Backed by
                    </span>
                    <Link
                      href="https://www.zetachain.com/"
                      target="_blank"
                      style={{
                        position: "relative",
                        zIndex: 9999,
                        display: "block",
                      }}
                    >
                      <ZetaChainLogo
                        height={30}
                        className="w-auto h-[30px]"
                        style={{
                          filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.8))",
                          position: "relative",
                          zIndex: 9999,
                        }}
                      />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Dialog>
      )}
    </AnimatePresence>
  );
};
