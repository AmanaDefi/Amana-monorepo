import React, { useEffect, useState, useRef } from "react";
import { Cog6ToothIcon } from "@heroicons/react/24/outline";
import { motion, AnimatePresence } from "framer-motion";
import { useSlippage } from "@/hooks/hooks";
import { EMPTY_BALANCE } from "@/utils/helpers";
import {
  CheckTheTxIsInProgress,
  updateLocalStorageObject,
} from "@/utils/localStorageUtils";
import { bigIntReplacer } from "@/utils/utils";
import { InfoBlock } from "../VaultsWrapper/components/InfoBlock.tsx/index";
import CloseModalIcon from "../svg/CloseModalIcon";
import AutoDropdownIcon from "../svg/AutoDropdownIcon";

export default function SlippageSettingsDropdown({
  setInputBalance,
  vaultId,
}: {
  setInputBalance: Function;
  vaultId: string;
}) {
  const { slippageValue, isAuto, setSlippage, toggleAuto } = useSlippage();
  const [isOpen, setIsOpen] = useState(false);
  const [customInputValue, setCustomInputValue] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const presetValues = [0.1, 0.5, 1.0];

  useEffect(() => {
    const isTxIsInProggress = CheckTheTxIsInProgress(vaultId);
    if (isTxIsInProggress) return;

    if (isOpen) {
      const isPresetValue = presetValues.includes(slippageValue) || isAuto;
      if (!isPresetValue) {
        setShowCustomInput(true);
        setCustomInputValue(slippageValue.toString());
      } else {
        setShowCustomInput(false);
        setCustomInputValue("");
      }

      setInputBalance(EMPTY_BALANCE);
      updateLocalStorageObject(vaultId, {
        inputBal: JSON.stringify(EMPTY_BALANCE, bigIntReplacer),
      });
    }
  }, [setInputBalance, slippageValue, isAuto, isOpen, vaultId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handlePresetSelect = (value: number) => {
    const isTxIsInProggress = CheckTheTxIsInProgress(vaultId);
    if (isTxIsInProggress) return;

    setSlippage(value);
    if (isAuto) {
      toggleAuto();
    }
    setShowCustomInput(false);
    setCustomInputValue("");
  };

  const handleAutoToggle = () => {
    const isTxIsInProggress = CheckTheTxIsInProgress(vaultId);
    if (isTxIsInProggress) return;

    toggleAuto();
    setShowCustomInput(false);
    setCustomInputValue("");
  };

  const handleCustomClick = () => {
    const isTxIsInProggress = CheckTheTxIsInProgress(vaultId);
    if (isTxIsInProggress) return;

    setShowCustomInput(true);
    if (isAuto) {
      toggleAuto();
    }

    if (!presetValues.includes(slippageValue)) {
      setCustomInputValue(slippageValue.toString());
    } else {
      setCustomInputValue("");
    }
  };

  const handleCustomInputChange = (value: string) => {
    const isTxIsInProggress = CheckTheTxIsInProgress(vaultId);
    if (isTxIsInProggress) return;

    if (value === "") {
      setCustomInputValue("");
      return;
    }

    if (/[^0-9.]/.test(value)) return;

    if ((value.match(/\./g) || []).length > 1) return;

    const numValue = parseFloat(value);

    if (value[value.length - 1] === "." || numValue === 0) {
      setCustomInputValue(value);
      return;
    }

    if (numValue <= 100) {
      if (numValue < 0.1) {
        setCustomInputValue("0.1");
        setSlippage(0.1);
      } else {
        if (value.includes(".") && value.split(".")[1].length > 2) {
          const fixedValue = numValue.toFixed(2);
          setCustomInputValue(fixedValue);
          setSlippage(parseFloat(fixedValue));
        } else {
          setCustomInputValue(value);
          if (!isNaN(numValue)) {
            setSlippage(numValue);
          }
        }
      }
    }
  };

  const handleCustomInputBlur = () => {
    if (customInputValue === "" || parseFloat(customInputValue) === 0) {
      setCustomInputValue(slippageValue.toString());
    }
  };

  const isPresetActive = (value: number) => {
    return !isAuto && !showCustomInput && slippageValue === value;
  };

  const isCustomActive = () => {
    return (
      !isAuto && (!presetValues.includes(slippageValue) || showCustomInput)
    );
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button onClick={() => setIsOpen(!isOpen)} className="group">
        <Cog6ToothIcon className="w-6 h-6 text-customGray300 group-hover:text-customGray200 group-hover:transition-transform group-hover:rotate-180 group-hover:!duration-700" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute top-full right-0 mt-2 z-50"
            style={{
              width: "240px",
              background: "#1D2A41",
              borderRadius: "8px",
              padding: "8px 13px 16px 13px",
            }}
          >
            <button
              onClick={() => setIsOpen(false)}
              className="block absolute top-2 right-2 text-gray-400 hover:text-white transition-colors p-3"
            >
              <CloseModalIcon width={12} height={12} />
            </button>

            <div className="flex items-center gap-2 mb-6 mt-10">
              <span className="text-white text-[16px] font-normal">
                Max slippage
              </span>
              <InfoBlock isRight>
                💡 Your transaction will revert if the price changes by more
                than the slippage percentage.
              </InfoBlock>
            </div>

            <div className="flex flex-wrap mb-3 gap-2">
              <button
                onClick={handleAutoToggle}
                className={`px-[10px] py-1 rounded-full font-medium transition-all duration-200 flex flex-row items-center gap-[10px] ${
                  isAuto
                    ? "bg-[#3E73C4] text-white"
                    : "bg-[#161C27] text-gray-300 hover:bg-[#3E73C4] "
                }`}
              >
                <AutoDropdownIcon width={16} height={17} />
                <p className="text-[16px] font-normal">Auto</p>
              </button>
              <button
                onClick={() => handlePresetSelect(0.1)}
                className={`px-[10px] py-1 rounded-full text-[16px] font-normal transition-all duration-200 ${
                  isPresetActive(0.1)
                    ? "bg-[#3E73C4] text-white"
                    : "bg-[#161C27] text-gray-300 hover:bg-[#3E73C4] "
                }`}
              >
                0.1%
              </button>
              <button
                onClick={() => handlePresetSelect(0.5)}
                className={`px-[10px] py-1 rounded-full text-[16px] font-normal transition-all duration-200 ${
                  isPresetActive(0.5)
                    ? "bg-[#3E73C4] text-white"
                    : "bg-[#161C27] text-gray-300 hover:bg-[#3E73C4] "
                }`}
              >
                0.5%
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handlePresetSelect(1.0)}
                className={`px-[10px] py-1 rounded-full text-[16px] font-normal transition-all duration-200 ${
                  isPresetActive(1.0)
                    ? "bg-[#3E73C4] text-white "
                    : "bg-[#161C27] text-gray-300 hover:bg-[#3E73C4]"
                }`}
              >
                1.0%
              </button>

              {showCustomInput ? (
                <div
                  className={`flex items-center px-3 py-2 rounded-full transition-all duration-200 flex-1 ${
                    isCustomActive() && "bg-[#161C27]"
                  }`}
                >
                  <input
                    type="text"
                    className="bg-transparent text-white text-[16px] font-normal outline-none w-[100px]"
                    value={customInputValue}
                    onChange={(e) => handleCustomInputChange(e.target.value)}
                    onBlur={handleCustomInputBlur}
                  />
                  <span className="text-gray-300 ml-1">%</span>
                </div>
              ) : (
                <button
                  onClick={handleCustomClick}
                  className={`px-[10px] py-1 rounded-full text-[16px] font-normal transition-all duration-200 flex-1 max-w-[100px] ${
                    isCustomActive()
                      ? "bg-[#3E73C4] text-white "
                      : "bg-[#161C27] text-[#535E73] hover:bg-[#3E73C4] "
                  }`}
                >
                  Custom
                  <span className="text-white"> %</span>
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
