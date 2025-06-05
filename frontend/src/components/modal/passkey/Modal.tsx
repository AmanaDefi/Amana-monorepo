import { Dialog, Transition } from "@headlessui/react";
import { Fragment } from "react";
import React from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  contentClassName?: string;
}

export function Modal({
  isOpen,
  onClose,
  children,
  title,
  contentClassName,
}: ModalProps) {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[1000]" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div
            className="fixed inset-0 bg-black bg-opacity-70"
            aria-hidden="true"
          />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel
                className={`w-full max-w-md transform rounded-[24px] bg-[#14171F] pt-[45px] pb-[26px] pl-[57px] pr-[57px] shadow-xl transition-all
                            ${contentClassName || ""} // Додаємо передані класи
                           `}
              >
                {title && (
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-white mb-4"
                  >
                    {title}
                  </Dialog.Title>
                )}

                {children}

                <button
                  type="button"
                  className="absolute top-6 right-6 text-white text-3xl hover:text-gray-400 transition-colors"
                  onClick={onClose}
                >
                  &times;
                </button>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
